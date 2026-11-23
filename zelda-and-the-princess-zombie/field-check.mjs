// A voluntary, on-device measurement of the frames the renderer submitted during play.
import { insideHall } from './hall.mjs';
import { hordePosition, HORDE_COUNT } from './world.mjs';

function distribution() {
  return { bins: new Uint32Array(1002), count: 0, maximum: 0, total: 0 };
}
function observe(d, milliseconds) {
  d.bins[Math.min(1001, Math.round(milliseconds))]++;
  d.count++;
  d.total += milliseconds;
  d.maximum = Math.max(d.maximum, milliseconds);
}
function percentile(d, q) {
  const target = Math.ceil(d.count * q);
  if (!target) return null;
  let seen = 0;
  for (let i = 0; i < d.bins.length; i++) {
    seen += d.bins[i];
    if (seen >= target) return i === 1001 ? '>1000' : i;
  }
}
function section(w) {
  const p = w.player;
  if (insideHall(p.x, p.z)) return 'The Long Hall';
  if (!w.ropeFallen && Object.values(w.hostActors || {}).some((a) =>
    (a.state === 'windup' || a.state === 'pursue') && Math.hypot(a.x - p.x, a.z - p.z) < 24))
    return 'Close combat';
  if (
    w.actors?.some(
      (a) =>
        a.alive &&
        a.alerted &&
        ['wolf', 'troll', 'dragon'].includes(a.type) &&
        Math.hypot(a.x - p.x, a.z - p.z) < 24
    )
  )
    return 'Close combat';
  if (p.z > 960) {
    // Sample rank centres rather than just the head. It may already be at the gate.
    for (let i = 0; i < HORDE_COUNT; i += 192) {
      const q = hordePosition(w, i);
      if (Math.hypot(q.x - p.x, q.z - p.z) < 30) return 'Beside the host';
    }
  }
  return p.z < 120 && Math.abs(p.x) < 120 ? 'Forest clearing' : 'On the journey';
}

export function createFieldCheck() {
  let active = false,
    last = null,
    pending = null,
    place = '',
    nextPlace = 0;
  let sessions = new Map(),
    heard = new Map();
  function pause() {
    last = null;
    pending = null;
    nextPlace = 0;
  }
  function frame(time, world, surface, backend = 'Renderer') {
    if (!active || !Number.isFinite(time) || !world?.player || !surface) return;
    if (time >= nextPlace || last === null) {
      place = section(world);
      nextPlace = time + 350;
    }
    let row = sessions.get(place);
    if (!row) {
      row = {
        name: place,
        frames: distribution(),
        input: distribution(),
        backend,
        width: surface.width,
        height: surface.height,
      };
      sessions.set(place, row);
    }
    row.backend = backend;
    row.width = surface.width;
    row.height = surface.height;
    if (last !== null && time > last) observe(row.frames, time - last);
    if (pending !== null && time >= pending) {
      observe(row.input, time - pending);
      pending = null;
    }
    last = time;
  }
  function snapshot() {
    return [...sessions.values()].map((r) => ({
      scene: r.name,
      frames: r.frames.count,
      seconds: r.frames.total / 1000,
      median: percentile(r.frames, 0.5),
      p95: percentile(r.frames, 0.95),
      worst: Math.round(r.frames.maximum),
      inputs: r.input.count,
      inputP95: percentile(r.input, 0.95),
      backend: r.backend,
      size: r.width + ' × ' + r.height,
    }));
  }
  function input(time) {
    if (active && Number.isFinite(time) && pending === null) pending = time;
  }
  function start() {
    pause();
    active = true;
  }
  function stop() {
    pause();
    active = false;
  }
  function reset() {
    stop();
    sessions = new Map();
    heard = new Map();
  }

  function mount(container, { resume, playExample }) {
    const doc = container.ownerDocument;
    container.classList.add('device-report');
    function add(tag, txt, parent = container) {
      const el = doc.createElement(tag);
      if (txt) el.textContent = txt;
      parent.append(el);
      return el;
    }
    function action(label, fn, parent = container) {
      const b = add('button', label, parent);
      b.type = 'button';
      b.className = 'secondary';
      b.addEventListener('click', fn);
      return b;
    }
    function draw() {
      container.replaceChildren();
      const rows = snapshot().filter((r) => r.frames);
      add('p', 'Measure the game as you play on this device. Pauses are excluded. Results stay in this tab.');
      action(
        active ? 'Continue measuring' : rows.length ? 'Resume measuring' : 'Measure while playing',
        () => {
          start();
          resume();
        }
      );
      if (active)
        action('Stop measuring', () => {
          stop();
          draw();
        });
      if (rows.length) {
        const list = add('dl');
        for (const row of rows) {
          add('dt', row.scene, list);
          add(
            'dd',
            Math.round(row.seconds) +
              ' s · ' +
              row.frames +
              ' frame intervals · ' +
              row.backend +
              ' ' +
              row.size +
              ' · median ' +
              row.median +
              ' ms · 95th percentile ' +
              row.p95 +
              ' ms · slowest ' +
              row.worst +
              ' ms' +
              (row.inputs
                ? ' · input to next rendered frame, 95th percentile ' +
                  row.inputP95 +
                  ' ms (' +
                  row.inputs +
                  ' samples)'
                : ''),
            list
          );
        }
        add(
          'p',
          'A 33 ms interval is about 30 frames per second. Input timing ends when the game submits its next frame. Display and speaker latency require a separate measurement.'
        );
      }
      add('h3', 'Speaker check');
      add('p', 'Listen at your usual playing volume. Each sample uses your current mix.');
      const notice = add('p');
      notice.setAttribute('role', 'status');
      let serial = 0;
      for (const [id, label] of [
        ['step', 'Footstep'],
        ['wolf', 'Wolf warning'],
        ['bell', 'Tower bell'],
      ]) {
        const group = add('div');
        group.className = 'device-listen';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', label);
        const b = action(
          'Play ' + label.toLowerCase(),
          async () => {
            const n = ++serial;
            try {
              const played = await playExample(id);
              if (n !== serial || !b.isConnected) return;
              notice.textContent = played
                ? 'Listening for ' + label.toLowerCase() + '.'
                : 'Enable sound and check the mixer, then try again.';
              louder.disabled = clear.disabled = !played;
            } catch {
              if (n === serial) notice.textContent = 'Audio is unavailable on this device.';
            }
          },
          group
        );
        const response = add('span', heard.get(id) || '', group);
        response.setAttribute('role', 'status');
        function answer(value) {
          heard.set(id, value);
          response.textContent = value;
        }
        const clear = action('Heard clearly', () => answer(label + ' heard clearly'), group);
        const louder = action('Too faint', () => answer(label + ' too faint'), group);
        clear.disabled = louder.disabled = true;
        clear.setAttribute('aria-label', label + ' heard clearly');
        louder.setAttribute('aria-label', label + ' too faint');
      }
      if (rows.length || heard.size)
        action('Clear measurements', () => {
          reset();
          draw();
        });
    }
    draw();
  }
  return { frame, input, pause, start, stop, reset, snapshot, mount };
}
