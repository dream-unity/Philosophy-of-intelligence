import { createLandscape } from './sound-landscape.mjs';
import { createHostSoundscape, hostFoley } from './sound-host.mjs';
import { createScore, playEnding } from './sound-score.mjs';
import { createScoreInstruments } from './score-instruments.mjs';
import { hordePosition, HORDE_COUNT } from './world.mjs';
import { insideHall } from './hall.mjs';
import { footing, fordStoneX } from './travel.mjs';
import { walkSound, scuffSound, breathSound, creatureSound, useVial, metalContact } from './sound-foley.mjs';

const bellPitch = { low: 207.65, mid: 246.94, high: 293.66 };
const tower = { x: 30.46, z: 1516.08 };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const groupNames = ['music', 'effects', 'ambience'];

export function createAudio() {
  const score = createScore();
  const hostSoundscape = createHostSoundscape();
  const mix = { music: 1, effects: 1, ambience: 1 },
    channels = {};
  const cueSpace = {};
  let cueUntil = 0, cueDepth = 0;
  let ctx, master, hallSend, landscape, samples, effects, ambience, music;
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
    recentSpeed = 0,
    turnHeading = 0,
    headingAt = 0,
    nextScuff = 0,
    exertion = 0;
  let nextMix = 0,
    nextBreath = 0,
    nextCreature = 0,
    lastLureBeat = -1,
    lastLureAt;
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
      attack = 0.012,
      destination = dest
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
      const panner = route(envelope, destination, pan);
      source.onended = () => {
        source.disconnect();
        envelope.disconnect();
        panner?.disconnect();
      };
      source.start(time);
      source.stop(time + duration + 0.02);
      return source;
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
      let output = ch;
      if (group !== 'effects') {
        output = ctx.createGain();
        cueSpace[group] = output.gain;
        ch.connect(output);
      }
      output.connect(master);
      if (group !== 'music') output.connect(hallSend);
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
    music.note = createScoreInstruments(ctx, channels.music, music.note);
    samples = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3.137), ctx.sampleRate);
    const data = samples.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    landscape = createLandscape(ctx, channels.ambience, samples);
  }
  function setMix(values) {
    for (const name of groupNames) {
      const value = values?.[name];
      if (!Number.isFinite(value)) continue;
      mix[name] = clamp(value);
      channels[name]?.gain.cancelScheduledValues(ctx.currentTime);
      channels[name]?.gain.setTargetAtTime(mix[name], ctx.currentTime, 0.035);
    }
  }
  function makeRoomForCue(time, duration, depth = 0.72) {
    if (mix.effects <= 0) return;
    cueDepth = time < cueUntil ? Math.max(depth, cueDepth) : depth;
    cueUntil = Math.max(cueUntil, time + duration);
    // Separate faders keep consecutive bells and warnings clear while the
    // player's mix sliders remain live, even during the release.
    for (const [group, gain] of Object.entries(cueSpace)) {
      gain.cancelScheduledValues(time);
      gain.setTargetAtTime(1 - (group === 'music' ? 1 : 0.72) * cueDepth * mix.effects, time, 0.018);
      gain.setTargetAtTime(1, cueUntil, 0.34);
    }
  }
  function applyEnabled() {
    if (!ctx || disposed) return;
    clearTimeout(suspendTimer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(enabled ? 0.58 : 0, ctx.currentTime, enabled ? 0.09 : 0.024);
    if (enabled && touched && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!enabled) {
      music?.note.reset?.(ctx.currentTime);
      suspendTimer = setTimeout(() => {
        if (!enabled && !disposed) ctx.suspend().catch(() => {});
      }, 5500);
      lastT = undefined;
      lastX = undefined;
      lastZ = undefined;
      stride = recentSpeed = exertion = 0;
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
  function acoustic(source, reach = 14, floor = 0, openTower = false) {
    const p = latest?.player;
    if (!p || !source || !Number.isFinite(source.x) || !Number.isFinite(source.z))
      return { pan: 0, gain: 1, brightness: 1, d: 0 };
    const d = distance(source, p);
    const angle = Math.atan2(source.x - p.x, source.z - p.z) - p.yaw;
    const exterior = !openTower && insideHall(p.x, p.z) !== insideHall(source.x, source.z);
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
    const at = acoustic(src, 262, 0.16, true);
    effects.bell(bellPitch[tone], t, 0.255 * at.gain, 2.47, at.pan, at.brightness);
  }
  function pullBell(t, tone) {
    towerBell(t, tone);
    if (!latest?.ropeFallen && latest?.player && distance(latest.player, tower) < 35) {
      const at = acoustic(tower, 10);
      effects.noise(0.24 * at.gain, 1010, 0.18, t, at.pan, 0.052);
      effects.note('triangle', 277, 0.035 * at.gain, t + 0.037, 0.115, at.pan, 179, 0.03);
    }
  }
  async function preview(id) {
    if (!['step', 'wolf', 'bell'].includes(id) || disposed || !enabled || mix.effects <= 0) return false;
    unlock();
    if (!ctx || !effects) return false;
    try {
      if (ctx.state !== 'running') await ctx.resume();
    } catch {
      return false;
    }
    if (disposed || !enabled || ctx.state !== 'running') return false;
    const t = ctx.currentTime + 0.07;
    if (id === 'step') {
      walkSound(effects, 'leaves', t, -0.12, 3.95);
      walkSound(effects, 'leaves', t + 0.43, 0.12, 3.95);
      scuffSound(effects, 'leaves', t + 0.73, -0.12, 3.95);
    } else if (id === 'wolf') creatureSound(effects, 'wolf', t, -0.45, 0.8, true);
    else effects.bell(bellPitch.low, t, 0.2, 2.47, 0.08, 0.88);
    return true;
  }
  function hostAnswer(t) {
    if (!latest || latest.ropeFallen) return;
    const positions = [];
    for (const fraction of [0.02, 0.31, 0.65, 0.93]) {
      const sample = Math.floor(HORDE_COUNT * fraction);
      const row = sample - sample % 48;
      for (let file = 0; file < 48; file++) {
        const id = row + (sample + file) % 48;
        if (latest.hostFallen?.[id] || latest.hostActors?.[id]) continue;
        positions.push(hordePosition(latest, id));
        break;
      }
    }
    const head = positions[0];
    if (!head) return;
    const arrivals = positions.map((pos, i) => {
      const at = acoustic(pos, 146, 0.19);
      // One rank takes up another's cry. Account for the different sound paths
      // to a listener standing at either end of a stretched-out column.
      return { at, delay: 0.12 * i + distance(head, pos) / 225 + at.d / 343 };
    });
    const first = Math.min(...arrivals.map((v) => v.delay));
    for (const [i, { at, delay }] of arrivals.entries()) {
      const when = t + delay - first;
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
        makeRoomForCue(t, 1.38);
        ['low', 'high', 'mid'].forEach((n, i) => pullBell(t + i * 0.46, n));
        break;
      case 'wristbell':
        if (bellPitch[kind]) {
          makeRoomForCue(t, 0.48);
          towerBell(t, kind, namedSource || tower);
        }
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
          const near = acoustic(nearest('witch'), 6);
          // Lantern hook, then the ember phials knocked together in the witch's palm.
          effects.noise(0.1 * near.gain, 940, 0.17, t, near.pan, 0.033);
          for (const [i, f] of [1510, 1960, 1700].entries())
            effects.bell(f, t + 0.36 + i * 0.12, 0.055 * near.gain, 0.21, near.pan, 0.55);
        }
        break;
      case 'telegraph':
        makeRoomForCue(t, kind === 'dragon' ? 0.76 : kind === 'host' ? 0.66 : 0.43, 0.85);
        if (kind === 'host') hostFoley(effects, 'windup', t, pan, g, ev.i);
        else creatureSound(effects, kind, t, pan, g, true);
        break;
      case 'host':
        if (at.d < 55) {
          if (kind === 'notice') makeRoomForCue(t, 0.28, 0.44);
          hostFoley(effects, kind, t, pan, g, ev.i);
        }
        break;
      case 'enemy-breath':
        creatureSound(effects, kind || 'dragon', t, pan, g * 0.96, true);
        break;
      case 'strike':
        makeRoomForCue(t, 0.16, 0.24);
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
        if (kind === 'zombie') hostFoley(effects, 'struck', t, pan, g, ev.i);
        else metalContact(effects, kind, t, pan, g);
        break;
      case 'dodge':
        scuffSound(effects, kind || 'gravel', t, -0.18, 6.4);
        breathSound(effects, t + 0.08, 0.58, false);
        break;
      case 'land':
        walkSound(effects, kind || latest?.player?.surface || 'grass', t, pan, 6.4);
        effects.noise(0.21 * g, 720, 0.17, t + 0.035, pan, 0.017);
        break;
      case 'bough':
        metalContact(effects, 'wood', t, pan, g);
        effects.noise(0.43 * g, 480, 0.38, t + 0.055, pan, 0.064);
        break;
      case 'guard':
        effects.noise(0.19, 1490, 0.16, t, 0.12, 0.018);
        effects.note('triangle', 678, 0.045, t + 0.036, 0.17, -0.04, 625);
        break;
      case 'block':
        if (kind === 'host') hostFoley(effects, 'block', t, pan, g, ev.i);
        else metalContact(effects, 'metal', t, pan, g);
        if (kind === 'parry') effects.bell(984, t + 0.065, 0.113 * g, 0.48, pan);
        break;
      case 'hurt':
        if (kind === 'host') effects.noise(0.39, 1410, 0.16, t, pan, 0.025);
        effects.noise(0.63, 570, 0.29, t, pan);
        effects.note('triangle', 115, 0.15, t, 0.32, pan, 45);
        break;
      case 'knock': {
        const reply = kind === 'reply';
        const rhythm = kind === 'single' ? [0] : [0, 0.17, reply ? 0.83 : 0.61];
        for (const [i, offset] of rhythm.entries()) {
          effects.noise(0.28 * g, reply ? 700 : 1010, 0.055, t + offset, pan, 0.003);
          effects.note('triangle', reply ? 173 : 215, (i === 2 ? 0.1 : 0.075) * g, t + offset, 0.13, pan, 91);
        }
        break;
      }
      case 'fieldbird': {
        if (kind === 'wings') {
          for (let i = 0; i < 6; i++) ambience.noise(0.15 * g, 1450 + i * 70, 0.12, t + i * 0.08, pan, 0.024);
        } else {
          const alarm = kind === 'alarm';
          for (const at of alarm ? [0, 0.11] : [0, 0.16, 0.42])
            ambience.note(
              'sine',
              alarm ? 2330 : 1760,
              0.1 * g,
              t + at,
              alarm ? 0.08 : 0.13,
              pan,
              alarm ? 1420 : 2100
            );
        }
        break;
      }
      case 'latch':
        if (kind === 'hoof') {
          for (const offset of [0, 0.11, 0.32]) effects.noise(0.29 * g, 730, 0.09, t + offset, pan, 0.006);
        } else {
          effects.noise(0.29 * g, 1940, 0.16, t, pan, 0.008);
          effects.bell(619, t + 0.13, 0.07 * g, 0.28, pan);
        }
        break;
      case 'relay': {
        const slipping = kind === 'slip';
        effects.noise(0.26 * g, slipping ? 1620 : 860, slipping ? 0.47 : 0.21, t, pan, 0.014);
        effects.note(
          'triangle',
          slipping ? 522 : 274,
          0.065 * g,
          t + 0.05,
          slipping ? 0.37 : 0.13,
          pan,
          slipping ? 131 : 204
        );
        break;
      }
      case 'pebble':
        for (const [i, offset] of [0, 0.18, 0.29].entries())
          effects.noise((0.28 * g) / (i + 1), 1260 + 190 * i, 0.08, t + offset, pan, 0.004);
        break;
      case 'throw':
        effects.noise(0.21 * g, 1980, 0.13, t, pan, 0.026);
        effects.bell(1310, t + 0.025, 0.035 * g, 0.14, pan);
        break;
      case 'potion':
        useVial(effects, kind || (latest?.sequence?.id === 'bound' ? 'drink' : 'shatter'), t, pan, g);
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
          makeRoomForCue(t, 0.58);
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
          music.note('cello', 123.47, 0.051, t, 1.19, -0.07, 123.47, 0.16);
          music.note('horn', 185, 0.044, t + 0.36, 1.4, 0.06, 185, 0.28);
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
        if (name === 'release') {
          effects.noise(0.31 * g, 800, 0.45, t + 0.23, pan, 0.07);
          const duration = latest?.sequence?.duration || 6;
          // Hooves gather on the board, land on tile, then recede down the aisle.
          for (const [u, x, z, m] of [
            [0.48, 31.4, 1516.7, 'wood'],
            [0.62, 31.7, 1515.6, 'wood'],
            [0.73, 31.8, 1514.8, 'stone'],
            [0.78, 32.1, 1513.4, 'stone'],
            [0.85, 32.8, 1508, 'stone'],
            [0.93, 33.5, 1503, 'stone'],
          ]) {
            const pos = acoustic({ x, z }, 9),
              when = t + (u - 0.37) * duration;
            effects.note(
              'triangle',
              m === 'wood' ? 216 : 318,
              0.11 * pos.gain,
              when,
              0.11,
              pos.pan,
              154,
              0.004
            );
            effects.noise(0.23 * pos.gain, m === 'wood' ? 890 : 1880, 0.095, when, pos.pan, 0.006);
          }
        }
        break;
      case 'gallery':
        if (kind === 'wrong') metalContact(effects, 'wood', t, pan, g);
        else effects.bell(kind === 'memory' ? 246.94 : 311.1, t, 0.13 * g, 1.4, pan);
        break;
      case 'recognition':
        if (kind === 'hand') {
          effects.noise(0.12 * g, 1370, 0.21, t, pan, 0.07);
          music.note('harp', 493.88, 0.039, t + 0.04, 1.35, pan);
          break;
        }
        for (const delay of [0, 0.19, 0.53]) effects.noise(0.14 * g, 1170, 0.065, t + delay, pan, 0.007);
        music.note('harp', 329.63, 0.064, t, 1.7, 0.13);
        music.note('viola', 415.3, 0.052, t + 0.45, 1.5, -0.13);
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
        music.note('cello', 207.65, 0.081, t, 2.2, 0.1, 146.83, 0.28);
        effects.noise(0.27, 910, 0.59, t, 0.04, 0.081);
        break;
      case 'ending':
        music.note.reset?.(t);
        playEnding(kind || latest?.ending?.id, t, music.note);
        break;
    }
  }
  function surfaceAt(world) {
    const p = world.player;
    const surface = p.surface || footing(world, p.x, p.z);
    if (
      (surface === 'water' || surface === 'stone') &&
      p.z >= 1007 &&
      p.z <= 1035 &&
      Math.abs(p.x - fordStoneX(clamp((p.z - 1008) / 1.76, 0, 15))) < 1.05
    )
      return 'wetstone';
    return surface;
  }
  function updateFootwork(world, t) {
    const p = world.player,
      now = world.elapsed;
    // The simulation steps at 30 Hz. An intervening display frame has no
    // movement sample. Treating it as a stop causes a scuff every other frame.
    if (now === lastT) return;
    const dt = now - lastT,
      dx = p.x - lastX,
      dz = p.z - lastZ,
      d = Math.hypot(dx, dz);
    lastT = now;
    lastX = p.x;
    lastZ = p.z;
    if (!(dt > 0 && dt < 0.7 && d < 8) || world.ending || world.sequence || world.dialogue) {
      stride = recentSpeed = exertion = 0;
      return;
    }
    const speed = d / dt,
      surface = surfaceAt(world);
    const airborne = p.airborne || (p.verticalSpeed || 0) < -0.7;
    if (!airborne) stride += d;
    const strideLength = clamp(0.87 + speed * 0.16, 0.87, 2.05);
    if (stride >= strideLength) {
      stride %= strideLength;
      walkSound(effects, surface, t, step++ % 2 ? -0.12 : 0.12, speed);
    }
    const heading = d > 0.001 ? Math.atan2(dx, dz) : turnHeading;
    const corner = speed > 2.1 && Math.cos(heading - turnHeading) < 0.69;
    if (!airborne && now >= nextScuff && (corner || (speed < 1.3 && recentSpeed > 2.1))) {
      scuffSound(effects, surface, t, step % 2 ? -0.11 : 0.11, recentSpeed);
      nextScuff = now + 0.48;
      recentSpeed = 0;
    }
    if (corner || now - headingAt > 0.28 || speed < 1.5) {
      turnHeading = heading;
      headingAt = now;
    }
    recentSpeed = Math.max(speed, recentSpeed * Math.exp(-dt * 1.7));
    const stamina = clamp(p.stamina ?? 1),
      output = clamp((speed - 4.1) / 2.1);
    const work = Math.max(output * 0.86, 1 - stamina);
    exertion += (work - exertion) * (1 - Math.exp(-dt / (work > exertion ? 0.95 : 3)));
    if (exertion > 0.23 && t >= nextBreath) {
      breathSound(effects, t, exertion, speed < 2);
      nextBreath = t + 2.05 - exertion * 0.94;
    }
  }
  function update(world, listeningOnly = false) {
    latest = world;
    const p = world?.player;
    if (!enabled || !ctx || ctx.state !== 'running' || !p || disposed) return;
    const t = ctx.currentTime;
    if (lastPlayer !== p) {
      if (lastPlayer) music.note.reset?.(t);
      lastPlayer = p;
      lastT = undefined;
      lastX = lastZ = undefined;
      turnHeading = p.yaw;
      headingAt = nextScuff = world.elapsed;
      step = stride = exertion = recentSpeed = 0;
      nextCreature = nextMix = 0;
      lastLureAt = undefined;
      lastLureBeat = -1;
      nextBreath = t + 1;
    }
    if (!listeningOnly && !world.feastAftermath) updateFootwork(world, t);
    if (t < nextMix) return;
    nextMix = t + 0.22;
    score(world, t, music.note, listeningOnly);
    const room = insideHall(p.x, p.z);
    hallSend.gain.setTargetAtTime(room ? 0.93 : 0, t, 0.14);
    landscape.update(world, t, room, acoustic, listeningOnly);
    if (world.ending || world.sequence || listeningOnly) return;
    const lure = world.fieldMedicine?.lure;
    if (lure && world.elapsed < lure.until && distance(p, lure) < 58) {
      if (lastLureAt !== lure.at) {
        lastLureAt = lure.at;
        lastLureBeat = -1;
      }
      const beat = Math.floor((world.elapsed - lure.at) / 1.24);
      if (beat > 0 && beat !== lastLureBeat) {
        const source = acoustic(lure, 16);
        const level = (0.045 + 0.055 * clamp((lure.until - world.elapsed) / 12)) * source.gain;
        effects.bell(832, t, level, 0.55, source.pan);
        effects.bell(1267, t + 0.09, level * 0.52, 0.34, source.pan);
        lastLureBeat = beat;
      }
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
    hostSoundscape(world, t, ambience, acoustic);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(suspendTimer);
    if (!ctx) return;
    landscape?.dispose();
    ctx.close().catch(() => {});
  }
  return { unlock, setEnabled, setMix, update, cue, preview, dispose };
}
