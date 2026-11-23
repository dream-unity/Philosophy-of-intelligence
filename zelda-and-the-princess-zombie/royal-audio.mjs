// All three recordings live with the game. Dialogue, the square and the
// accompaniment use the existing effects, ambience and music faders.
const scenes = {
  report: [{ file: 'royal-xero.mp3', start: 0.38, bus: 'effects', level: 1 }],
  honour: [
    { file: 'royal-king.mp3', start: 0.32, bus: 'effects', level: 1 },
    { file: 'royal-square.mp3', start: 0, bus: 'ambience', level: 0.73 },
  ],
};
const lines = {
  report: [
    [0, 'viola', 246.94, .035, 2.8, -.35], [0.07, 'harp', 369.99, .026, 2, .28],
    [2.85, 'cello', 164.81, .032, 3.1, -.28], [4.8, 'flute', 493.88, .024, 1.65, .18],
    [6.2, 'harp', 554.37, .035, 1.6, -.12],
  ],
  honour: [
    [0, 'horn', 246.94, .048, 1.05, -.36], [.61, 'horn', 369.99, .046, 1.36, .31],
    [1.86, 'viola', 329.63, .028, 2.6, .28], [2.03, 'cello', 164.81, .039, 3.3, -.3],
    [4.22, 'harp', 415.3, .031, 1.86, .1], [5.73, 'horn', 293.66, .044, 1.78, -.36],
    [7.31, 'horn', 369.99, .071, .96, .36], [7.98, 'horn', 440, .075, .98, -.31],
    [8.69, 'horn', 493.88, .081, 2.65, .22], [8.72, 'cello', 164.81, .063, 2.73, -.29],
    [8.77, 'viola', 415.3, .042, 2.24, -.16], [9.67, 'harp', 659.25, .037, 2.13, .3],
  ],
};

export function createRoyalAudio(ctx, channels, note) {
  const loaded = new Map(), players = new Map();
  let previousPhase, through = -1, previousTime = 0, previousClock = 0;
  function preload() {
    if (loaded.size || typeof window === 'undefined' || !ctx.decodeAudioData) return;
    for (const clip of [...scenes.report, ...scenes.honour]) {
      loaded.set(clip.file, null);
      fetch(new URL(clip.file, import.meta.url))
        .then(r => { if (!r.ok) throw Error('Recording unavailable'); return r.arrayBuffer(); })
        .then(bytes => ctx.decodeAudioData(bytes))
        .then(buffer => loaded.set(clip.file, buffer))
        .catch(() => {});
    }
  }
  function stop() {
    if (previousPhase) note.reset?.(ctx.currentTime);
    for (const src of players.values()) src.stop();
    players.clear();
    previousPhase = undefined;
    through = -1;
  }
  function update(prize) {
    if (prize) preload();
    if (!scenes[prize?.phase]) {
      if (previousPhase) stop();
      return false;
    }
    const phase = prize.phase, t = Math.max(0, prize.time), now = ctx.currentTime;
    const jumped = Math.abs((now - previousClock) - (t - previousTime)) > 0.3 || t + 0.02 < previousTime;
    if (phase !== previousPhase || jumped) {
      stop();
      note.reset?.(now);
      previousPhase = phase;
      through = t - 0.16;
    }
    previousClock = now;
    previousTime = t;
    for (const clip of scenes[phase]) {
      const buf = loaded.get(clip.file);
      if (!buf || players.has(clip.file) || t < clip.start - 0.14 || t >= clip.start + buf.duration) continue;
      const src = ctx.createBufferSource(), level = ctx.createGain();
      src.buffer = buf;
      const start = Math.max(now, now + clip.start - t);
      level.gain.setValueAtTime(0, start);
      level.gain.linearRampToValueAtTime(clip.level, start + .025);
      src.connect(level);
      level.connect(channels[clip.bus]);
      players.set(clip.file, src);
      src.onended = () => {
        if (players.get(clip.file) === src) players.delete(clip.file);
        src.disconnect();
        level.disconnect();
      };
      src.start(start, Math.max(0, t - clip.start));
    }
    for (const [at, voice, hz, level, duration, pan] of lines[phase]) {
      if (at > through && at <= t + .12) note(voice, hz, level, now + Math.max(0, at - t), duration, pan);
    }
    through = t + .12;
    return true;
  }
  return { update, stop };
}
