import { charcoalWind, roosts } from './story-field.mjs';

const clamp = (v) => Math.max(0, Math.min(1, v));
const tau = 2 * Math.PI;
const well = { x: -155, z: 850 };
const runs = [
  { x: -125, z: 1019 }, // Water breaking against the ford stones.
  { x: 41, z: 1025 }, // Outside the downstream bridge pier.
];

function seeded(seed) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}

// Build tiny mono sources once. Bubbles excite different resonances as they
// break, rather than repeating the same swell of filtered white noise.
function brookBuffer(ctx) {
  const rate = 16000;
  const buffer = ctx.createBuffer(1, rate * 6, rate);
  const data = buffer.getChannelData(0);
  const random = seeded(38791);
  // Reuse a pool of grains. Starting a game on a tablet shouldn't require
  // evaluating a sine for every bubble in six seconds of moving water.
  const grains = Array.from({ length: 59 }, () => {
    const freq = 220 + 2200 * random() ** 2;
    const length = Math.ceil(rate * (0.021 + 0.09 * random()));
    const grain = new Float32Array(length);
    let phase = tau * random();
    const rise = 0.06 + 0.24 * random();
    for (let i = 0; i < length; i++) {
      const u = i / length;
      phase += (tau * freq * (1 + rise * u)) / rate;
      grain[i] = (Math.sin(phase) * (1 - u) ** 3 * Math.min(1, i / 37)) / (1 + freq / 2000);
    }
    return grain;
  });
  for (let i = 0; i < 1360; i++) {
    const grain = grains[Math.floor(random() * grains.length)];
    const volume = 0.012 + 0.09 * random() ** 3;
    let j = Math.floor(random() * data.length);
    for (let k = 0; k < grain.length; k++) {
      data[j] += grain[k] * volume;
      if (++j === data.length) j = 0;
    }
  }
  return buffer;
}

// A wood thrush's liquid slur and a dove's low, breathy answer occupy different
// registers from the alarm flock. Each syllable changes pitch continuously.
const calls = [
  [
    [0, 0.27, 1550, 1890, 220],
    [0.33, 0.12, 1970, 1620, 90],
    [0.61, 0.32, 1600, 1240, 160],
  ],
  [
    [0, 0.2, 1520, 1160, 130],
    [0.29, 0.13, 1410, 1770, 180],
    [0.47, 0.3, 1690, 1390, 240],
  ],
  [
    [0, 0.16, 487, 525, 14],
    [0.23, 0.6, 521, 409, 33],
  ],
];
function birdBuffer(ctx, syllables, low) {
  const rate = 16000;
  const last = syllables[syllables.length - 1];
  const buffer = ctx.createBuffer(1, Math.ceil((last[0] + last[1]) * rate), rate);
  const data = buffer.getChannelData(0);
  const random = seeded(low ? 9841 : 115);
  let breath = 0;
  for (const [start, length, from, to, arch] of syllables) {
    let phase = 0;
    const n = Math.floor(length * rate);
    const offset = Math.floor(start * rate);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const freq = from + (to - from) * u + arch * Math.sin(Math.PI * u) + 11 * Math.sin(tau * u * 2.3);
      phase += (tau * freq) / rate;
      breath += (random() - 0.5 - breath) * 0.16;
      const env = Math.sin(Math.PI * u) ** 1.55;
      const voiced = Math.sin(phase) + (low ? 0.42 : 0.12) * Math.sin(2 * phase + 0.32 * u);
      data[offset + i] = env * (0.64 * voiced + breath * (low ? 0.21 : 0.1));
    }
  }
  return buffer;
}

export function createLandscape(ctx, output, noiseBuffer) {
  const brook = brookBuffer(ctx);
  const birds = calls.map((line, i) => birdBuffer(ctx, line, i === 2));
  const random = seeded(15631);
  let perchIndex = 0,
    nextCall = 0,
    previousPlayer,
    callingBird;

  function bed(buffer, type, hz, q) {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner?.();
    source.buffer = buffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = hz;
    filter.Q.value = q;
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(pan || output);
    pan?.connect(output);
    source.start();
    return {
      mix(level, cutoff, side, time) {
        gain.gain.setTargetAtTime(level, time, 0.58);
        filter.frequency.setTargetAtTime(cutoff, time, 0.78);
        pan?.pan.setTargetAtTime(side, time, 0.22);
      },
      dispose() {
        source.stop();
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        pan?.disconnect();
      },
    };
  }
  const air = bed(noiseBuffer, 'bandpass', 460, 0.64);
  let current,
    lastWater = -Infinity;

  function nearBird(p, wooded, t, acoustic) {
    // Stable perches on a 90-m grid. Move to a different tree at the next
    // call; turning the listener never changes that tree's position.
    const i = perchIndex++;
    const cellX = Math.round(p.x / 90);
    const cellZ = Math.round(p.z / 90);
    const rng = seeded(Math.imul(cellX + 51, 6353) + Math.imul(cellZ + 47, 7919) + (i % 5) * 2707);
    const tree = { x: cellX * 90 + 76 * (rng() - 0.5), z: cellZ * 90 + 80 * (rng() - 0.5) };
    const pos = acoustic(tree, 19);
    const low = Math.abs(p.z - 482) < 75 || random() < 0.3;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner?.();
    source.buffer = birds[low ? 2 : i % 2];
    if (source.playbackRate) source.playbackRate.value = 0.9 + 0.16 * rng();
    gain.gain.value = (low ? 0.055 : 0.037) * wooded * pos.gain;
    if (pan) pan.pan.value = pos.pan;
    source.connect(gain);
    gain.connect(pan || output);
    pan?.connect(output);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      pan?.disconnect();
      if (callingBird?.source === source) callingBird = null;
    };
    callingBird = { source, gain, pan, tree };
    source.start(t);
  }

  function hushBird(t) {
    if (!callingBird) return;
    callingBird.gain.gain.setTargetAtTime(0, t, 0.018);
    callingBird.source.stop(t + 0.13);
    callingBird = null;
  }

  function update(world, t, room, acoustic, listeningOnly = false) {
    const p = world.player;
    if (previousPlayer !== p) {
      previousPlayer = p;
      hushBird(t);
      nextCall = t + 4 + random() * 4;
      perchIndex = 0;
    }
    const now = world.elapsed;
    const wooded = clamp((1300 - p.z) / 450);
    const exposed = clamp(1 - Math.abs(p.z - 482) / 100);
    const wind = charcoalWind(now);
    const side = wind.x * Math.cos(p.yaw) - wind.z * Math.sin(p.yaw);
    const curl = now + p.x * 0.031 - p.z * 0.008;
    const swell = 0.5 + 0.27 * Math.sin(curl * 0.207) + 0.23 * Math.sin(curl * 0.39 + 1.8);
    const quiet = world.ending || world.sequence || world.dialogue?.kind === 'banquet';
    const space = quiet ? 0.24 : 1;
    // In the stone hall the outdoor canopy gives way to a narrow, low draft
    // from the entrance. The leaves and the kiln smoke share the same wind.
    const door = room ? acoustic({ x: 30, z: 1466 }, 26) : null;
    air.mix(
      space * (room ? 0.012 * door.gain : (0.009 + 0.011 * swell) * (0.7 + wooded * 0.3 + 0.61 * exposed)),
      room ? 235 + 65 * swell : 300 + 820 * swell + 190 * wooded,
      room ? door.pan * 0.55 : side * 0.37,
      t
    );

    const bank = clamp(1 - Math.abs(p.z - 1021) / 80);
    const spring = acoustic(well, 8);
    const nearbySpring = clamp(1 - spring.d / 44);
    const ford = acoustic(runs[0], 21);
    const pier = acoustic(runs[1], 21);
    const riverLevel = bank ** 1.45 * (0.22 + 0.52 * Math.max(ford.gain, pier.gain));
    const springLevel = nearbySpring ** 1.7 * 0.19;
    const riverPan =
      (ford.pan * ford.gain ** 2 + pier.pan * pier.gain ** 2) / (ford.gain ** 2 + pier.gain ** 2);
    const water = springLevel + riverLevel;
    if (water > 0) {
      lastWater = t;
      current ??= bed(brook, 'lowpass', 1260, 0.55);
    }
    if (current && t - lastWater > 4) {
      current.dispose();
      current = null;
    }
    current?.mix(
      space * water,
      680 + 2050 * Math.max(nearbySpring, bank),
      (spring.pan * springLevel + riverPan * riverLevel * 0.82) / Math.max(water, 0.001),
      t
    );

    const protectedRoost = roosts.some((r) => Math.hypot(p.x - r.x, p.z - r.z) < 55);
    const hunted = world.actors.some((a) => a.alive && a.alerted && Math.hypot(p.x - a.x, p.z - a.z) < 42);
    if (
      quiet ||
      listeningOnly ||
      world.dialogue ||
      world.flockQuietUntil > now ||
      protectedRoost ||
      hunted ||
      wooded < 0.29 ||
      room
    ) {
      nextCall = Math.max(nextCall, t + 2.3);
      hushBird(t);
      return;
    }
    if (callingBird?.pan) callingBird.pan.pan.setTargetAtTime(acoustic(callingBird.tree, 19).pan, t, 0.09);
    if (t >= nextCall) {
      nearBird(p, wooded, t, acoustic);
      nextCall = t + 8 + random() * 13;
    }
  }
  function dispose() {
    air.dispose();
    current?.dispose();
    hushBird(ctx.currentTime);
  }
  return { update, dispose };
}
