import { createScore } from './sound-score.mjs';
import { hordePosition, HORDE_COUNT, surfaceMaterial } from './world.mjs';
import { insideHall } from './hall.mjs';

const bellPitch = { low: 207.65, mid: 246.94, high: 293.66 };

/* Original, synthesized spatial soundscape with independent master/music/sfx buses,
   5-material footsteps, hall acoustics, combat contact/parry audio, enemy telegraphs,
   banquet cues, and distinct ending stings. */
export function createAudio() {
  const updateScore = createScore();
  let ctx, masterBus, musicBus, sfxBus, air, airTone, airLevel, noise;
  let enabled = true,
    touched = false,
    disposed = false,
    suspendTimer;
  let volumes = { master: 0.72, music: 0.8, sfx: 0.9 };
  let latest,
    lastX,
    lastZ,
    travelled = 0,
    nextBird = 0,
    nextMix = 0,
    foot = false;

  function destination(pan, target = sfxBus) {
    if (!pan || !ctx.createStereoPanner) return target;
    const node = ctx.createStereoPanner();
    node.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(target);
    return node;
  }

  function rawVoice(
    targetBus,
    kind,
    frequency,
    level,
    time,
    duration,
    pan = 0,
    endFrequency = frequency,
    attack = 0.012
  ) {
    const source = ctx.createOscillator(),
      envelope = ctx.createGain(),
      out = destination(pan, targetBus);
    source.type = kind;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(Math.max(12, endFrequency), time + duration);
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.00002, level), time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    source.connect(envelope);
    envelope.connect(out);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      if (out !== targetBus) out.disconnect();
    };
    source.start(time);
    source.stop(time + duration + 0.03);
  }

  function voice(kind, frequency, level, time, duration, pan = 0, endFrequency = frequency, attack = 0.012) {
    rawVoice(sfxBus, kind, frequency, level, time, duration, pan, endFrequency, attack);
    // Subtle stone slapback inside The Long Hall (#97)
    if (latest?.player && insideHall(latest.player.x, latest.player.z) && duration < 2.2) {
      rawVoice(sfxBus, kind, frequency, level * 0.28, time + 0.14, duration * 0.85, -pan * 0.5, endFrequency, attack + 0.02);
    }
  }

  function musicVoice(kind, frequency, level, time, duration, pan = 0, endFrequency = frequency, attack = 0.012) {
    rawVoice(musicBus, kind, frequency, level, time, duration, pan, endFrequency, attack);
  }

  function breath(level, centre, duration, time, pan = 0, attack = 0.03, q = 0.8, targetBus = sfxBus) {
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain(),
      out = destination(pan, targetBus);
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = centre;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.linearRampToValueAtTime(level, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(out);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      if (out !== targetBus) out.disconnect();
    };
    source.start(time, Math.random() * noise.duration);
    source.stop(time + duration + 0.03);
  }

  function bell(frequency, time, level, tail, pan) {
    voice('sine', frequency, level, time, tail, pan, frequency * 0.998);
    voice('sine', frequency * 2.71, level * 0.39, time, tail * 0.42, pan);
    voice('sine', frequency * 4.08, level * 0.14, time, tail * 0.25, pan);
  }

  function prepare() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    masterBus = ctx.createGain();
    masterBus.gain.value = 0;
    masterBus.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = volumes.music;
    musicBus.connect(masterBus);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = volumes.sfx;
    sfxBus.connect(masterBus);

    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3.137), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    air = ctx.createBufferSource();
    air.buffer = noise;
    air.loop = true;
    airTone = ctx.createBiquadFilter();
    airTone.type = 'lowpass';
    airTone.frequency.value = 840;
    airLevel = ctx.createGain();
    airLevel.gain.value = 0.032;
    air.connect(airTone);
    airTone.connect(airLevel);
    airLevel.connect(sfxBus);
    air.start();
  }

  function applyEnabled() {
    if (!ctx || disposed) return;
    clearTimeout(suspendTimer);
    masterBus.gain.cancelScheduledValues(ctx.currentTime);
    masterBus.gain.setTargetAtTime(enabled ? volumes.master * 0.75 : 0, ctx.currentTime, enabled ? 0.12 : 0.026);
    if (musicBus) musicBus.gain.setTargetAtTime(volumes.music, ctx.currentTime, 0.06);
    if (sfxBus) sfxBus.gain.setTargetAtTime(volumes.sfx, ctx.currentTime, 0.06);
    if (enabled && touched && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!enabled) {
      suspendTimer = setTimeout(() => {
        if (!enabled && !disposed) ctx.suspend().catch(() => {});
      }, 5500);
      lastX = undefined;
      lastZ = undefined;
      travelled = 0;
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

  function setVolumes(next) {
    volumes = {
      master: Math.max(0, Math.min(1, Number(next?.master ?? volumes.master))),
      music: Math.max(0, Math.min(1, Number(next?.music ?? volumes.music))),
      sfx: Math.max(0, Math.min(1, Number(next?.sfx ?? volumes.sfx))),
    };
    applyEnabled();
  }

  function bearing(x, z) {
    const p = latest?.player;
    return p && Number.isFinite(x) && Number.isFinite(z)
      ? Math.sin(Math.atan2(x - p.x, z - p.z) - p.yaw) * 0.85
      : 0;
  }

  function playEndingSting(id, t) {
    if (id === 'saved') {
      // Warm ascending major dawn chord
      [293.66, 369.99, 440, 587.33].forEach((f, i) => {
        rawVoice(musicBus, 'sine', f, 0.075, t + i * 0.14, 2.8, (i - 1.5) * 0.22, f * 1.003, 0.06);
        rawVoice(musicBus, 'triangle', f * 2, 0.018, t + i * 0.14, 1.4, (i - 1.5) * 0.22, f * 2, 0.05);
      });
    } else if (id === 'feast') {
      // Sudden dissonant plunge and fading heartbeat
      rawVoice(musicBus, 'sawtooth', 146.8, 0.07, t, 1.9, 0, 82.4, 0.04);
      rawVoice(musicBus, 'sine', 155.5, 0.065, t + 0.05, 1.8, -0.2, 77.8, 0.08);
      rawVoice(sfxBus, 'sine', 58, 0.12, t + 0.35, 0.35, 0, 36, 0.01);
      rawVoice(sfxBus, 'sine', 52, 0.07, t + 0.82, 0.45, 0, 32, 0.01);
    } else if (id === 'bound') {
      // Hypnotic hollow minor-sixth sway
      rawVoice(musicBus, 'sine', 246.9, 0.065, t, 2.3, -0.3, 246.9, 0.18);
      rawVoice(musicBus, 'sine', 392.0, 0.05, t + 0.25, 2.2, 0.3, 388, 0.25);
      rawVoice(musicBus, 'triangle', 164.8, 0.04, t + 0.55, 2.1, 0, 155.5, 0.3);
    } else if (id === 'horde') {
      // Heavy iron slam + distant answering groan
      breath(0.32, 340, 1.8, t, 0, 0.06, 0.6);
      rawVoice(sfxBus, 'triangle', 82.4, 0.13, t, 1.4, 0, 48, 0.02);
      bell(207.65, t + 0.28, 0.11, 2.6, 0);
    } else {
      // 'wilds' — mournful fading woodland fifth
      rawVoice(musicBus, 'sine', 220, 0.065, t, 2.2, -0.15, 212, 0.12);
      rawVoice(musicBus, 'triangle', 146.8, 0.05, t + 0.2, 2.4, 0.15, 138, 0.22);
    }
  }

  function cue(event) {
    if (!enabled || disposed || !ctx || ctx.state !== 'running') return;
    const name = typeof event === 'string' ? event : event?.type;
    const evPan = Number.isFinite(event?.x) ? bearing(event.x, event.z) : 0;
    const t = ctx.currentTime + 0.005;

    switch (name) {
      case 'bell': {
        const p = latest?.player,
          distance = p ? Math.hypot(30 - p.x, 1520 - p.z) : 1500;
        const level = 0.06 + 0.18 / (1 + distance / 280),
          pan = bearing(30, 1520);
        ['low', 'high', 'mid'].forEach((tone, i) => bell(bellPitch[tone], t + i * 0.46, level, 2.45, pan));
        break;
      }
      case 'answer': {
        // Multi-rank spatialized chorus across front, middle, and trailing ranks (#99)
        const p = latest?.player;
        const ranks = [0, Math.floor(HORDE_COUNT * 0.35), Math.floor(HORDE_COUNT * 0.72)];
        ranks.forEach((idx, r) => {
          const pos = hordePosition(latest || { elapsed: 0 }, idx);
          const dist = p ? Math.hypot(pos.x - p.x, pos.z - p.z) : 1200;
          const presence = (0.35 + 0.65 / (1 + dist / 260)) * (r === 0 ? 1 : 0.65);
          const pan = bearing(pos.x, pos.z);
          const delay = r * 0.16;
          breath(0.18 * presence, 420 + r * 70, 1.5, t + delay, pan, 0.32);
          voice('triangle', 98 + r * 11, 0.048 * presence, t + delay + 0.08, 1.6, pan, 74 + r * 8, 0.3);
        });
        break;
      }
      case 'howl': {
        // Spatialized wolf howl toward actual wolf bearing (#94)
        const pan = Number.isFinite(event?.x) ? evPan : -0.28;
        voice('sine', 424, 0.07, t, 1.25, pan, 281, 0.19);
        voice('triangle', 611, 0.02, t + 0.14, 1.1, pan * 0.85, 410, 0.25);
        break;
      }
      case 'strike':
        breath(0.36, 2180, 0.17, t, 0.16, 0.022, 1.1);
        break;
      case 'thrust':
        breath(0.42, 2680, 0.14, t, 0.08, 0.015, 1.5);
        voice('sine', 320, 0.04, t, 0.12, 0.08, 180, 0.01);
        break;
      case 'hit_flesh':
        // Distinct solid hit confirmation (#93)
        breath(0.45, 760, 0.14, t, evPan, 0.008, 0.9);
        voice('triangle', 148, 0.14, t, 0.16, evPan, 62, 0.006);
        break;
      case 'hit_clang':
        // Crisp metallic clang on troll/guard/bell (#93)
        voice('triangle', 840, 0.09, t, 0.22, evPan, 620, 0.004);
        voice('sine', 1690, 0.06, t, 0.28, evPan, 1520, 0.004);
        breath(0.24, 3100, 0.09, t, evPan, 0.005, 1.6);
        break;
      case 'parry':
        // Resonant perfect-parry steel ring (#32, #93)
        bell(659.25, t, 0.14, 0.95, evPan);
        voice('sine', 1975, 0.08, t, 0.45, evPan, 1880, 0.004);
        break;
      case 'dodge':
        breath(0.28, 1280, 0.16, t, 0, 0.018, 0.7);
        break;
      case 'breath_winded':
        breath(0.22, 920, 0.34, t, 0, 0.05, 1.2);
        breath(0.18, 840, 0.38, t + 0.32, 0, 0.06, 1.2);
        break;
      case 'land':
        breath(0.26, 480, 0.12, t, 0, 0.008, 0.7);
        voice('sine', 82, 0.09, t, 0.11, 0, 40, 0.006);
        break;
      case 'hurt':
        breath(0.55, 520, 0.28, t, evPan);
        voice('triangle', 99, 0.14, t, 0.3, evPan, 43, 0.008);
        break;
      case 'telegraph_wolf':
        // Sharp canine snarl before lunge (#95)
        breath(0.3, 1080, 0.28, t, evPan, 0.04, 1.4);
        voice('sawtooth', 185, 0.055, t, 0.32, evPan, 145, 0.03);
        break;
      case 'telegraph_troll':
        // Deep hulking roar before club slam (#95)
        voice('sawtooth', 96, 0.085, t, 0.56, evPan, 68, 0.08);
        breath(0.28, 390, 0.48, t, evPan, 0.08, 0.8);
        break;
      case 'tremor':
        voice('sine', 64, 0.18, t, 0.48, evPan, 28, 0.01);
        voice('triangle', 128, 0.08, t, 0.34, evPan, 52, 0.01);
        breath(0.38, 310, 0.36, t, evPan, 0.015, 0.6);
        break;
      case 'telegraph_dragon':
        // Heavy wing-whoosh and fiery inhale (#95)
        breath(0.36, 620, 0.52, t, evPan, 0.12, 0.7);
        voice('triangle', 142, 0.07, t + 0.12, 0.55, evPan, 240, 0.18);
        break;
      case 'dragon_fire':
        breath(0.58, 1280, 0.68, t, evPan, 0.04, 0.55);
        voice('sawtooth', 124, 0.075, t, 0.62, evPan, 78, 0.04);
        break;
      case 'cinder_shatter':
      case 'potion':
        // Glass shatter + expanding cinder fire burst (#96)
        [1420, 1980, 2640].forEach((f, i) => voice('triangle', f, 0.045, t + i * 0.025, 0.12, 0, f * 0.78, 0.003));
        breath(0.52, 1120, 0.58, t + 0.04, 0, 0.03, 0.65);
        voice('sine', 160, 0.1, t + 0.04, 0.42, 0, 58, 0.02);
        break;
      case 'witch_drink':
        // Dark syrupy hypnotic swallow (#96)
        [330, 311, 246.9].forEach((f, i) => voice('sine', f, 0.06, t + i * 0.11, 0.55, 0, f * 0.94, 0.04));
        break;
      case 'moonwell_fill':
        // Clear glassy silver-water filling chime (#96)
        [587.3, 880, 1174.6, 1567.9].forEach((f, i) =>
          voice('sine', f, 0.055, t + i * 0.075, 0.48, (i - 1.5) * 0.14, f * 1.01, 0.015)
        );
        break;
      case 'cure_splash':
        // Radiant silver water harmonic wash (#96)
        breath(0.28, 2400, 0.55, t, 0, 0.04, 0.9);
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          voice('sine', f, 0.06, t + i * 0.06, 1.35, (i - 2) * 0.18, f * 1.005, 0.02)
        );
        break;
      case 'gate_seal':
        // Iron portcullis crashing into stone (#8)
        breath(0.46, 460, 0.75, t, bearing(30, 1435), 0.015, 0.7);
        voice('triangle', 92, 0.18, t, 0.7, bearing(30, 1435), 34, 0.01);
        voice('sine', 360, 0.08, t, 0.55, bearing(30, 1435), 210, 0.008);
        break;
      case 'loot':
        bell(750, t, 0.065, 0.55, 0.15);
        bell(1032, t + 0.12, 0.05, 0.65, 0.05);
        break;
      case 'sluice':
      case 'chime': {
        const freq = bellPitch[event?.text];
        if (freq) {
          const instrument = latest?.actors?.find((a) => a.type === 'bell' && a.tone === event.text);
          bell(freq, t, 0.17, 1.8, instrument ? bearing(instrument.x, instrument.z) : 0);
        } else if (name === 'chime') {
          breath(0.4, 420, 1.6, t, 0, 0.14);
          voice('triangle', 87, 0.095, t, 1.25, 0, 42, 0.2);
          bell(415.3, t + 0.24, 0.08, 1.4, 0.1);
        }
        break;
      }
      case 'banquet_ambient': {
        // Subtle audible clue inside the Long Hall: stag breath, hoof scrape, taut rope creak (#98)
        breath(0.11, 560, 0.65, t, evPan, 0.18, 1.1);
        voice('triangle', 124, 0.025, t + 0.25, 0.35, evPan, 96, 0.08);
        breath(0.08, 1480, 0.16, t + 0.7, evPan * 0.6, 0.02, 2.2);
        break;
      }
      case 'rustle':
        breath(0.18, 1760, 0.26, t, -0.35);
        break;
      case 'reveal':
        bell(207.65, t, 0.15, 2.2, 0);
        voice('triangle', 207.65, 0.095, t + 0.19, 2.2, 0.12, 154, 0.28);
        break;
      case 'ending':
        playEndingSting(event?.text, t);
        break;
    }
  }

  function stepSound(mat, t, pan) {
    if (mat === 'stone') {
      breath(0.18, 1420, 0.09, t, pan, 0.008, 1.2);
      voice('sine', 102, 0.075, t, 0.09, pan, 48, 0.006);
    } else if (mat === 'wood') {
      breath(0.15, 680, 0.11, t, pan, 0.008, 0.9);
      voice('triangle', 132, 0.09, t, 0.13, pan, 68, 0.007);
    } else if (mat === 'water') {
      breath(0.28, 1680, 0.21, t, pan, 0.025, 0.65);
      voice('sine', 240, 0.03, t, 0.12, pan, 130, 0.015);
    } else if (mat === 'road') {
      breath(0.17, 1080, 0.12, t, pan, 0.012, 1.0);
      voice('sine', 78, 0.06, t, 0.095, pan, 42, 0.008);
    } else {
      // Forest leaves / moss
      breath(0.19, 760, 0.16, t, pan, 0.016, 0.75);
      voice('sine', 64, 0.055, t, 0.1, pan, 38, 0.01);
    }
  }

  function update(world) {
    latest = world;
    if (!enabled || !ctx || ctx.state !== 'running' || !world?.player || disposed) return;
    const t = ctx.currentTime,
      p = world.player;
    const distance = lastX === undefined ? 0 : Math.hypot(p.x - lastX, p.z - lastZ);
    lastX = p.x;
    lastZ = p.z;
    if (distance < 10 && !world.ending) travelled += distance;
    if (travelled >= 2.35) {
      travelled = 0;
      foot = !foot;
      const mat = surfaceMaterial(world, p.x, p.z);
      stepSound(mat, t, foot ? -0.1 : 0.1);
    }
    if (t < nextMix) return;
    nextMix = t + 0.25;
    updateScore(world, t, musicVoice);
    const inHall = insideHall(p.x, p.z);
    const forest = inHall ? 0 : Math.min(1, Math.max(0, (1470 - p.z) / 600));
    airTone.frequency.setTargetAtTime(
      inHall ? 240 : 340 + forest * (560 + 100 * Math.sin(t * 0.16)),
      t,
      0.6
    );
    airLevel.gain.setTargetAtTime(
      inHall ? 0.012 : 0.017 + forest * (0.028 + 0.01 * Math.sin(t * 0.37)),
      t,
      0.6
    );
    if (t >= nextBird && forest > 0.38 && !world.ending) {
      if (nextBird > 0) {
        const pan = Math.sin(t * 2.2) * 0.78,
          f = 1650 + Math.random() * 750;
        voice('sine', f, 0.032 * forest, t, 0.12, pan, f * 1.22);
        voice('sine', f * 1.07, 0.021 * forest, t + 0.14, 0.18, pan, f * 0.86);
      }
      nextBird = t + 5 + Math.random() * 9;
    }
  }

  function dispose() {
    disposed = true;
    clearTimeout(suspendTimer);
    if (!ctx) return;
    air?.stop();
    ctx.close().catch(() => {});
  }

  return { unlock, setEnabled, setVolumes, update, cue, dispose };
}
