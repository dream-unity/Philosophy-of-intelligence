import { createScore, playEnding } from './sound-score.mjs';
import { hordePosition, HORDE_COUNT } from './world.mjs';
import { insideHall } from './hall.mjs';
import { footing, fordStoneX } from './travel.mjs';
import { walkSound, creatureSound, useVial, metalContact } from './sound-foley.mjs';

const bellPitch = { low: 207.65, mid: 246.94, high: 293.66 };
const tower = { x: 30.46, z: 1516.08 };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const groupNames = ['music', 'effects', 'ambience'];

export function createAudio() {
  const score = createScore();
  const mix = { music: 1, effects: 1, ambience: 1 },
    channels = {};
  let ctx, master, hallSend, air, airTone, airLevel, samples, effects, ambience, music;
  let enabled = true,
    touched = false,
    disposed = false,
    suspendTimer;
  let latest,
    lastPlayer,
    lastX,
    lastZ,
    lastT,
    stride = 0,
    step = 0,
    previousSpeed = 0,
    previousYaw = 0;
  let nextMix = 0,
    nextBird = 0,
    nextBreath = 0,
    nextCreature = 0,
    nextRank = 0,
    nextWater = 0,
    rank = 0;
  function route(node, dest, pan) {
    if (Math.abs(pan) < 0.001 || !ctx.createStereoPanner) {
      node.connect(dest);
      return null;
    }
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    node.connect(panner);
    panner.connect(dest);
    return panner;
  }
  function instrument(dest) {
    function note(
      shape,
      frequency,
      level,
      time,
      duration,
      pan = 0,
      endFrequency = frequency,
      attack = 0.012
    ) {
      const source = ctx.createOscillator(),
        envelope = ctx.createGain();
      source.type = shape;
      source.frequency.setValueAtTime(frequency, time);
      source.frequency.exponentialRampToValueAtTime(Math.max(14, endFrequency), time + duration);
      envelope.gain.setValueAtTime(0.00001, time);
      envelope.gain.exponentialRampToValueAtTime(
        Math.max(0.00002, level),
        time + Math.min(attack, duration * 0.7)
      );
      envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
      source.connect(envelope);
      const panner = route(envelope, dest, pan);
      source.onended = () => {
        source.disconnect();
        envelope.disconnect();
        panner?.disconnect();
      };
      source.start(time);
      source.stop(time + duration + 0.02);
    }
    function noise(level, centre, duration, time, pan = 0, attack = 0.03, q = 0.82) {
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        env = ctx.createGain();
      source.buffer = samples;
      source.loop = true;
      filter.type = 'bandpass';
      filter.frequency.value = centre;
      filter.Q.value = q;
      env.gain.setValueAtTime(0.00001, time);
      env.gain.linearRampToValueAtTime(Math.max(0.00002, level), time + Math.min(attack, duration * 0.7));
      env.gain.exponentialRampToValueAtTime(0.00001, time + duration);
      source.connect(filter);
      filter.connect(env);
      const panner = route(env, dest, pan);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        env.disconnect();
        panner?.disconnect();
      };
      source.start(time, Math.random() * samples.duration);
      source.stop(time + duration + 0.02);
    }
    function bell(f, time, level, tail, pan, brightness = 1) {
      note('sine', f, level, time, tail, pan, f * 0.998);
      note('sine', f * 2.71, level * 0.39 * brightness, time, tail * 0.42, pan);
      note('sine', f * 4.08, level * 0.14 * brightness, time, tail * 0.25, pan);
    }
    return { note, noise, bell };
  }
  function prepare() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    hallSend = ctx.createGain();
    hallSend.gain.value = 0;
    for (const group of groupNames) {
      const ch = ctx.createGain();
      ch.gain.value = mix[group];
      ch.connect(master);
      if (group !== 'music') ch.connect(hallSend);
      channels[group] = ch;
    }
    // Three early reflections and one longer stone return are shared by all
    // room sources. The wet send fades across the door with the listener.
    if (ctx.createDelay) {
      for (const [seconds, pan, amount, cutoff] of [
        [0.037, -0.43, 0.29, 3400],
        [0.071, 0.56, 0.25, 2770],
        [0.13, -0.23, 0.19, 2070],
        [0.227, 0.41, 0.13, 1570],
      ]) {
        const delay = ctx.createDelay(0.3),
          filter = ctx.createBiquadFilter(),
          level = ctx.createGain();
        delay.delayTime.value = seconds;
        filter.type = 'lowpass';
        filter.frequency.value = cutoff;
        level.gain.value = amount;
        hallSend.connect(delay);
        delay.connect(filter);
        filter.connect(level);
        route(level, master, pan);
      }
    }
    effects = instrument(channels.effects);
    ambience = instrument(channels.ambience);
    music = instrument(channels.music);
    samples = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3.137), ctx.sampleRate);
    const data = samples.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    air = ctx.createBufferSource();
    air.buffer = samples;
    air.loop = true;
    airTone = ctx.createBiquadFilter();
    airTone.type = 'lowpass';
    airTone.frequency.value = 840;
    airLevel = ctx.createGain();
    airLevel.gain.value = 0.035;
    air.connect(airTone);
    airTone.connect(airLevel);
    airLevel.connect(channels.ambience);
    air.start();
  }
  function setMix(values) {
    for (const name of groupNames) {
      const value = values?.[name];
      if (!Number.isFinite(value)) continue;
      mix[name] = clamp(value);
      channels[name]?.gain.setTargetAtTime(mix[name], ctx.currentTime, 0.035);
    }
  }
  function applyEnabled() {
    if (!ctx || disposed) return;
    clearTimeout(suspendTimer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(enabled ? 0.58 : 0, ctx.currentTime, enabled ? 0.09 : 0.024);
    if (enabled && touched && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!enabled) {
      suspendTimer = setTimeout(() => {
        if (!enabled && !disposed) ctx.suspend().catch(() => {});
      }, 5500);
      lastT = undefined;
      lastX = undefined;
      lastZ = undefined;
      stride = previousSpeed = 0;
    }
  }
  function unlock() {
    if (disposed) return;
    touched = true;
    if (!ctx) {
      try {
        prepare();
      } catch {
        return;
      }
    }
    applyEnabled();
  }
  function setEnabled(value) {
    if (enabled === !!value) return;
    enabled = !!value;
    applyEnabled();
  }
  function acoustic(source, reach = 14, floor = 0) {
    const p = latest?.player;
    if (!p || !source || !Number.isFinite(source.x) || !Number.isFinite(source.z))
      return { pan: 0, gain: 1, brightness: 1, d: 0 };
    const d = distance(source, p);
    const angle = Math.atan2(source.x - p.x, source.z - p.z) - p.yaw;
    const exterior = insideHall(p.x, p.z) !== insideHall(source.x, source.z);
    const byDoor = Math.hypot(p.x - 30, p.z - 1466);
    const throughDoor = exterior ? 0.28 + 0.5 / (1 + byDoor / 8) : 1;
    return {
      d,
      pan: Math.sin(angle) * 0.88,
      gain: (floor + (1 - floor) / (1 + d / reach)) * throughDoor,
      brightness: (throughDoor * (0.89 + 0.11 * Math.cos(angle))) / (1 + d / (reach * 4)),
    };
  }
  function nearest(type, except) {
    if (!latest?.player) return null;
    let best = null,
      d = Infinity;
    for (const a of latest.actors || []) {
      if (a.type !== type || !a.alive) continue;
      if (except && distance(a, except) < 0.1) continue;
      const range = distance(a, latest.player);
      if (range < d) {
        best = a;
        d = range;
      }
    }
    return best;
  }
  function towerBell(t, tone, src = tower) {
    const at = acoustic(src, 262, 0.16);
    effects.bell(bellPitch[tone], t, 0.255 * at.gain, 2.47, at.pan, at.brightness);
  }
  function hostAnswer(t) {
    if (!latest) return;
    for (const [i, fraction] of [0.02, 0.31, 0.65, 0.93].entries()) {
      const pos = hordePosition(latest, Math.floor(HORDE_COUNT * fraction));
      const at = acoustic(pos, 146, 0.19),
        when = t + i * 0.19;
      const level = at.gain * (i ? 0.81 : 1.06);
      ambience.noise(0.31 * level, 390 + i * 52 + at.brightness * 118, 1.3 + i * 0.13, when, at.pan, 0.24);
      ambience.note('triangle', 104 + i * 28, 0.11 * level, when + 0.06, 1.6, at.pan, 78 + i * 16, 0.28);
    }
  }
  function cue(ev) {
    if (!enabled || disposed || !ctx || ctx.state !== 'running') return;
    const name = typeof ev === 'string' ? ev : ev?.type,
      kind = ev?.text;
    const t = ctx.currentTime + 0.005,
      namedSource = Number.isFinite(ev?.x) && Number.isFinite(ev?.z) ? ev : null;
    const at = acoustic(namedSource || (name === 'howl' ? nearest('wolf') : null), 25);
    const g = at.gain,
      pan = at.pan;
    switch (name) {
      case 'bell':
        ['low', 'high', 'mid'].forEach((n, i) => towerBell(t + i * 0.46, n));
        break;
      case 'wristbell':
        if (bellPitch[kind]) towerBell(t, kind, namedSource || tower);
        break;
      case 'answer':
        hostAnswer(t);
        break;
      case 'howl': {
        effects.note('sine', 420, 0.092 * g, t, 1.28, pan, 265, 0.18);
        effects.note('triangle', 623, 0.032 * g * at.brightness, t + 0.14, 1.05, pan, 397, 0.21);
        const first = namedSource || nearest('wolf');
        const second = first && nearest('wolf', first);
        if (second) {
          const reply = acoustic(second, 30);
          effects.note('triangle', 367, 0.067 * reply.gain, t + 1.46, 1.22, reply.pan, 248, 0.21);
          effects.note(
            'sine',
            514,
            0.032 * reply.gain * reply.brightness,
            t + 1.69,
            0.94,
            reply.pan,
            386,
            0.15
          );
        }
        break;
      }
      case 'dialogue':
        if (latest?.dialogue?.kind === 'witch') {
          music.note('triangle', 415.3, 0.039, t + 0.11, 1.03, -0.12, 413.4, 0.14);
          music.note('triangle', 587.33, 0.029, t + 0.68, 0.78, 0.07, 584.7, 0.13);
          music.note('sine', 493.88, 0.041, t + 1.21, 1.46, -0.03, 492.3, 0.17);
        }
        break;
      case 'telegraph':
        creatureSound(effects, kind, t, pan, g, true);
        break;
      case 'enemy-breath':
        creatureSound(effects, kind || 'dragon', t, pan, g * 0.96, true);
        break;
      case 'strike':
        effects.noise(
          0.42,
          kind === 'thrust' ? 2640 : 2080,
          kind === 'thrust' ? 0.11 : 0.185,
          t,
          0.18,
          0.024
        );
        break;
      case 'impact':
        metalContact(effects, kind, t, pan, g);
        break;
      case 'guard':
        effects.noise(0.19, 1490, 0.16, t, 0.12, 0.018);
        effects.note('triangle', 678, 0.045, t + 0.036, 0.17, -0.04, 625);
        break;
      case 'block':
        metalContact(effects, 'metal', t, pan, g);
        break;
      case 'hurt':
        effects.noise(0.63, 570, 0.29, t, pan);
        effects.note('triangle', 115, 0.15, t, 0.32, pan, 45);
        break;
      case 'potion':
        useVial(effects, kind || (latest?.sequence?.id === 'bound' ? 'drink' : 'shatter'), t, pan);
        break;
      case 'loot':
        effects.noise(0.18, 1790, 0.22, t, 0.16);
        effects.bell(750, t + 0.09, 0.067, 0.48, 0.15);
        effects.bell(1032, t + 0.2, 0.05, 0.63, 0.07);
        break;
      case 'gather':
        effects.noise(0.2 * g, 2130, 0.23, t, pan, 0.043);
        effects.noise(0.17 * g, 980, 0.071, t + 0.15, pan, 0.006);
        effects.note('sine', 465, 0.036 * g, t + 0.2, 0.15, pan, 372);
        break;
      case 'sluice':
      case 'chime':
        if (bellPitch[kind]) {
          const source = namedSource || latest?.actors.find((a) => a.type === 'bell' && a.tone === kind);
          const pos = acoustic(source, 25);
          effects.bell(bellPitch[kind], t, 0.24 * pos.gain, 1.85, pos.pan);
        } else if (name === 'chime') {
          effects.bell(415.3, t, 0.088, 1.25, 0.03);
          effects.bell(623.2, t + 0.21, 0.045, 1.6, -0.1);
        }
        break;
      case 'chain': {
        const rising = kind === 'rise',
          count = rising ? 7 : kind === 'slack' ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const when = t + i * (rising ? 0.21 : kind === 'slack' ? 0.078 : 0.16);
          effects.noise(0.28 * g, 1100 + (i % 3) * 210, 0.115, when, pan, 0.01);
          effects.note(
            'triangle',
            kind === 'slack' ? 473 - i * 55 : 375 + (i % 3) * 31,
            0.08 * g,
            when,
            0.17,
            pan
          );
        }
        if (rising) effects.noise(0.68 * g, 370, 1.45, t, pan, 0.18);
        break;
      }
      case 'gate':
        if (kind === 'crossed') {
          music.note('triangle', 123.47, 0.051, t, 1.19, -0.07, 123.47, 0.16);
          music.note('sine', 185, 0.044, t + 0.36, 1.4, 0.06, 185, 0.28);
        } else {
          effects.noise(0.64 * g, 580, 0.95, t, pan, 0.095);
          metalContact(effects, 'stone', t + 0.71, pan, g);
          towerBell(t + 0.89, 'low');
          hostAnswer(t + 1.8);
        }
        break;
      case 'brush':
      case 'rustle':
        effects.noise(0.27 * g, 1700, 0.24, t, pan);
        break;
      case 'meal':
        if (at.d > 65) break;
        if (kind === 'hoof') {
          effects.note('triangle', 196, 0.135 * g, t, 0.12, pan, 123);
          effects.noise(0.29 * g, 680, 0.27, t + 0.08, pan);
        } else if (kind === 'chew') {
          effects.noise(0.27 * g, 660, 0.18, t, pan, 0.04);
          effects.note('sine', 196, 0.051 * g, t + 0.1, 0.1, pan, 89);
        } else if (kind === 'ribbon') {
          effects.noise(0.38 * g, 2280, 0.24, t, pan, 0.09);
          effects.noise(0.31 * g, 770, 0.09, t + 0.19, pan, 0.005);
        } else effects.noise(0.34 * g, 610, 0.69, t, pan, 0.14);
        break;
      case 'shackle':
        metalContact(effects, 'iron', t, pan, g * 0.65);
        break;
      case 'reed':
      case 'release':
        effects.noise(0.22 * g, 1670, 0.41, t, pan);
        if (name === 'release') effects.noise(0.31 * g, 800, 0.45, t + 0.23, pan, 0.07);
        break;
      case 'gallery':
        if (kind === 'wrong') metalContact(effects, 'wood', t, pan, g);
        else effects.bell(kind === 'memory' ? 246.94 : 311.1, t, 0.13 * g, 1.4, pan);
        break;
      case 'recognition':
        music.note('sine', 329.63, 0.064, t, 1.7, 0.13);
        music.note('sine', 415.3, 0.052, t + 0.45, 1.5, -0.13);
        break;
      case 'cure':
        effects.bell(415.3, t, 0.088 * g, 1.72, pan);
        effects.noise(0.14 * g, 2390, 0.71, t + 0.06, pan, 0.2);
        break;
      case 'compel':
        effects.noise(0.22, 850, 0.24, t, pan);
        effects.note('triangle', 293.66, 0.071, t, 0.52, pan, 246.94, 0.071);
        break;
      case 'reveal':
        music.note('triangle', 207.65, 0.081, t, 2.2, 0.1, 146.83, 0.28);
        effects.noise(0.27, 910, 0.59, t, 0.04, 0.081);
        break;
      case 'ending':
        playEnding(kind || latest?.ending?.id, t, music.note);
        break;
    }
  }
  function surfaceAt(world) {
    const p = world.player;
    const surface = p.surface || footing(world, p.x, p.z);
    if (surface === 'water' && Math.abs(p.x - fordStoneX(clamp((p.z - 1008) / 1.76, 0, 15))) < 1.05)
      return 'wetstone';
    return surface;
  }
  function update(world) {
    latest = world;
    const p = world?.player;
    if (!enabled || !ctx || ctx.state !== 'running' || !p || disposed) return;
    const t = ctx.currentTime;
    if (lastPlayer !== p) {
      lastPlayer = p;
      lastT = undefined;
      lastX = lastZ = undefined;
      previousYaw = p.yaw;
      step = stride = previousSpeed = rank = 0;
      nextCreature = nextRank = nextBird = nextWater = nextMix = 0;
      nextBreath = t + 1;
    }
    const dt = lastT === undefined ? 0 : t - lastT;
    const d = lastX === undefined ? 0 : Math.hypot(p.x - lastX, p.z - lastZ);
    const speed = dt > 0 && dt < 0.7 && d < 8 ? d / dt : 0;
    if (dt > 0 && dt < 0.7 && d < 8 && !world.ending) stride += d;
    const strideLength = clamp(0.87 + speed * 0.16, 0.87, 2.05);
    if (stride >= strideLength) {
      stride %= strideLength;
      walkSound(effects, surfaceAt(world), t, step++ % 2 ? -0.12 : 0.12, speed);
    }
    if (previousSpeed > 5 && (speed < 1.2 || Math.cos(p.yaw - previousYaw) < 0.4)) {
      effects.noise(0.26, 1240, 0.22, t, 0.12);
      if (t >= nextBreath - 0.5) effects.noise(0.18, 690, 0.48, t + 0.05, -0.08, 0.11);
    }
    if (speed > 5 && t >= nextBreath) {
      effects.noise(0.17, 735, 0.36, t, 0.02, 0.065);
      nextBreath = t + 1.32;
    }
    previousSpeed = speed;
    previousYaw = p.yaw;
    lastT = t;
    lastX = p.x;
    lastZ = p.z;
    if (t < nextMix) return;
    nextMix = t + 0.22;
    score(world, t, music.note);
    const room = insideHall(p.x, p.z);
    hallSend.gain.setTargetAtTime(room ? 0.93 : 0, t, 0.14);
    const forest = clamp((1450 - p.z) / 610);
    airTone.frequency.setTargetAtTime(room ? 310 : 480 + forest * (560 + 90 * Math.sin(t * 0.16)), t, 0.45);
    airLevel.gain.setTargetAtTime(
      room ? 0.009 : 0.021 + forest * (0.027 + 0.009 * Math.sin(t * 0.37)),
      t,
      0.55
    );
    if (world.ending || world.sequence) return;
    if (t >= nextWater && Math.abs(p.z - 1021) < 55) {
      const water = acoustic({ x: p.x - 9, z: 1021 }, 18);
      ambience.noise(0.28 * water.gain, 1180, 1.45, t, water.pan, 0.38);
      nextWater = t + 1.14;
    }
    if (t >= nextBird && forest > 0.38) {
      if (nextBird) {
        const side = Math.floor(t / 7) % 2 ? 1 : -1;
        const pos = { x: Math.floor(p.x / 30) * 30 + side * 22, z: Math.floor(p.z / 41) * 41 + 29 };
        const a = acoustic(pos, 28),
          f = 1670 + Math.random() * 660;
        ambience.note('sine', f, 0.049 * forest * a.gain, t, 0.13, a.pan, f * 1.2);
        ambience.note('sine', f * 1.07, 0.04 * forest * a.gain, t + 0.14, 0.18, a.pan, f * 0.86);
      }
      nextBird = t + 6 + Math.random() * 8;
    }
    if (t >= nextCreature) {
      let closest,
        dist = Infinity;
      for (const a of world.actors) {
        if (!a.alive || !['wolf', 'dragon', 'troll'].includes(a.type)) continue;
        const m = distance(p, a);
        if (m < dist && m < (a.type === 'dragon' ? 70 : 36)) {
          dist = m;
          closest = a;
        }
      }
      if (closest) {
        const a = acoustic(closest, 18);
        creatureSound(ambience, closest.type, t, a.pan, a.gain * (closest.alerted ? 0.74 : 0.38));
        nextCreature = t + (closest.type === 'dragon' ? 1.6 : closest.alerted ? 0.93 : 2.3);
      } else nextCreature = t + 0.35;
    }
    if (t >= nextRank && p.z > 950) {
      const pos = hordePosition(world, Math.floor(((rank++ * 0.381966) % 1) * HORDE_COUNT));
      const at = acoustic(pos, 17);
      if (at.d < 100) {
        ambience.noise(0.39 * at.gain, 650 + (rank % 4) * 134, 0.42, t, at.pan, 0.087);
        ambience.note('triangle', 127 + (rank % 3) * 24, 0.046 * at.gain, t + 0.06, 0.48, at.pan, 87, 0.17);
        if (rank % 5 === 0) ambience.bell(637, t + 0.15, 0.032 * at.gain, 0.31, at.pan);
      }
      nextRank = t + (at.d < 80 ? 0.39 : 0.72);
    }
  }
  function dispose() {
    disposed = true;
    clearTimeout(suspendTimer);
    if (!ctx) return;
    air?.stop();
    ctx.close().catch(() => {});
  }
  return { unlock, setEnabled, setMix, update, cue, dispose };
}
