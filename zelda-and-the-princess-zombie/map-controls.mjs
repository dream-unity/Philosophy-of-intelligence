import { drawFieldMap, mapProjection } from './field-map.mjs';
import { MAP } from './geography.mjs';
import { knownLandmarks, hasDirections, bearing, compassPoint, survey } from './navigation.mjs';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function control(label, f) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'secondary';
  b.textContent = label;
  b.onclick = f;
  return b;
}
export function makeFieldSurvey(world, save) {
  const field = survey(world),
    known = hasDirections(world),
    canvas = document.createElement('canvas'),
    bar = document.createElement('div'),
    text = document.createElement('details');
  const view = known
    ? { zoom: 1, x: 0, z: (MAP.minZ + MAP.maxZ) / 2 }
    : { zoom: 3, x: world.player.x, z: world.player.z };
  let pinMode = false,
    animation = 0,
    drag = null;
  canvas.id = 'field-map';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'North-up field map. Arrow keys pan. Plus and minus zoom. Text directions and marked places follow.'
  );
  bar.className = 'map-tools';
  text.className = 'map-details';
  const summary = document.createElement('summary');
  summary.textContent = 'Directions, places and pins';
  text.append(summary);
  const details = document.createElement('div');
  text.append(details);
  function describe() {
    details.replaceChildren();
    const p = world.player;
    const intro = document.createElement('p');
    intro.textContent =
      'Facing ' +
      compassPoint(p.yaw) +
      '. North is always at the top. ' +
      (known
        ? 'The marked route follows the landscape.'
        : 'Your field sketch records places as you reach them.');
    details.append(intro);
    const list = document.createElement('ul');
    for (const [place, name] of [
      ...knownLandmarks(world).map((l) => [l, l.name]),
      ...field.pins.map((pin, i) => [pin, 'Pin ' + (i + 1)]),
    ]) {
      const li = document.createElement('li'),
        d = Math.round(Math.hypot(p.x - place.x, p.z - place.z));
      const b = control(name, () => {
        view.x = place.x;
        view.z = place.z;
        view.zoom = Math.max(2, view.zoom);
        draw();
      });
      li.append(
        b,
        document.createTextNode(
          d < 7 ? ' · Here' : ' · ' + d + ' m ' + compassPoint(bearing(p, place)) + ' in a straight line'
        )
      );
      if (field.pins.includes(place))
        li.append(
          control('Remove', () => {
            field.pins.splice(field.pins.indexOf(place), 1);
            save();
            describe();
            draw();
          })
        );
      list.append(li);
    }
    details.append(list);
  }
  function draw() {
    drawFieldMap(canvas, world, view);
  }
  function schedule() {
    if (animation) return;
    animation = requestAnimationFrame(() => {
      animation = 0;
      if (canvas.isConnected) draw();
    });
  }
  function zoom(factor) {
    view.zoom = clamp(view.zoom * factor, 1, 24);
    schedule();
  }
  function pin(x, z) {
    field.pins.push({ x: Math.round(x), z: Math.round(z) });
    save();
    describe();
    schedule();
  }
  const drop = control('Place pin', () => {
    pinMode = !pinMode;
    drop.setAttribute('aria-pressed', String(pinMode));
    drop.textContent = pinMode ? 'Tap map to pin' : 'Place pin';
  });
  bar.append(
    control('−', () => zoom(1 / 1.5)),
    control('+', () => zoom(1.5)),
    control('Centre on me', () => {
      view.x = world.player.x;
      view.z = world.player.z;
      view.zoom = Math.max(view.zoom, 2);
      schedule();
    }),
    drop,
    control('Pin here', () => pin(world.player.x, world.player.z))
  );
  if (world.gateCrossed || field.visits.hall)
    bar.append(
      control('Castle plan', () => {
        view.x = 30;
        view.z = 1484;
        view.zoom = clamp(
          ((2.65 * Math.min(canvas.clientHeight, canvas.clientWidth)) / Math.max(canvas.clientHeight, 1)) * 8,
          10,
          22
        );
        schedule();
      })
    );
  bar.children[0].setAttribute('aria-label', 'Zoom out');
  bar.children[1].setAttribute('aria-label', 'Zoom in');
  drop.setAttribute('aria-pressed', 'false');
  function pan(dx, dz) {
    view.x = clamp(view.x + dx, MAP.minX, MAP.maxX);
    view.z = clamp(view.z + dz, MAP.minZ, MAP.maxZ);
    schedule();
  }
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2);
    },
    { passive: false }
  );
  canvas.addEventListener('pointerdown', (e) => {
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId) return;
    const size = canvas.getBoundingClientRect(),
      s = mapProjection(size.width, size.height, world, view).scale;
    if (!pinMode) pan((drag.x - e.clientX) / s, (e.clientY - drag.y) / s);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag?.id !== e.pointerId) return;
    if (pinMode && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 12) {
      const r = canvas.getBoundingClientRect(),
        q = mapProjection(r.width, r.height, world, view).world(e.clientX - r.left, e.clientY - r.top);
      pin(clamp(q[0], MAP.minX, MAP.maxX), clamp(q[1], MAP.minZ, MAP.maxZ));
      drop.click();
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => {
    drag = null;
  });
  canvas.addEventListener('keydown', (e) => {
    const d = 110 / view.zoom;
    const keys = {
      ArrowUp: () => pan(0, d),
      ArrowDown: () => pan(0, -d),
      ArrowLeft: () => pan(-d, 0),
      ArrowRight: () => pan(d, 0),
      '+': () => zoom(1.5),
      '=': () => zoom(1.5),
      '-': () => zoom(1 / 1.5),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  });
  describe();
  return { canvas, bar, text, draw };
}
