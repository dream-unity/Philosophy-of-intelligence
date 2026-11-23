// Short, original Foley instruments. Their source position and room are supplied
// by audio.mjs, so the same creature sounds anchored while the camera turns.
export function walkSound(sound, surface, time, side, speed) {
  const { noise, note } = sound;
  const fast = speed > 5,
    weight = fast ? 1.18 : 0.96;
  const thud = (freq, level = 0.095) =>
    note('sine', freq, level * weight, time, fast ? 0.135 : 0.105, side, freq * 0.55, 0.008);
  switch (surface) {
    case 'wood':
      thud(126);
      note('triangle', side < 0 ? 218 : 248, 0.095 * weight, time + 0.016, 0.18, side, 184);
      noise(0.21, 1750, 0.09, time, side, 0.008);
      break;
    case 'water':
      thud(73, 0.065);
      noise(0.58 * weight, 1280, 0.21, time, side, 0.019);
      noise(0.19, 2920, 0.14, time + 0.094, side * 0.7);
      note('sine', 690, 0.039, time + 0.11, 0.065, side, 365);
      break;
    case 'wetstone':
      thud(130);
      note('triangle', 293, 0.05, time, 0.095, side, 255);
      noise(0.37 * weight, 1340, 0.17, time + 0.018, side, 0.017);
      noise(0.17, 2670, 0.13, time + 0.092, side * 0.7);
      break;
    case 'gravel':
      thud(98);
      noise(0.38, 1830, 0.13, time, side, 0.012);
      noise(0.22, 2710, 0.09, time + 0.061, side, 0.012);
      break;
    case 'stone':
      thud(145);
      note('triangle', 310, 0.06, time, 0.09, side, 281);
      noise(0.29, 1950, 0.084, time, side, 0.009);
      break;
    case 'leaves':
      thud(76, 0.054);
      noise(0.36, 1730, 0.21, time, side, 0.026);
      noise(0.19, 3030, 0.15, time + 0.056, -side, 0.029);
      break;
    default:
      thud(85);
      noise(0.26, surface === 'grass' ? 1170 : 820, 0.14, time, side, 0.023);
  }
  if (fast) {
    noise(0.115, 2480, 0.11, time + 0.078, -side);
    if (side > 0) note('sine', 730, 0.013, time + 0.099, 0.058, -side, 718);
  }
}
export function scuffSound(sound, surface, t, pan, speed) {
  const center = {
    stone: 1870,
    gravel: 2330,
    wood: 1070,
    water: 1350,
    wetstone: 1510,
    leaves: 2060,
    grass: 1140,
  };
  const level = 0.13 + 0.026 * Math.min(6, speed);
  sound.noise(level, center[surface] || 1250, 0.22, t, pan, 0.021);
  if (surface === 'gravel' || surface === 'leaves')
    sound.noise(level * 0.48, 2860, 0.11, t + 0.076, -pan, 0.022);
}
export function breathSound(sound, t, effort, recovering) {
  // The cooler inhalation and the longer, lower exhalation form a pair.
  // Recovery naturally opens the spacing and lengthens the second breath.
  sound.noise(0.09 + 0.11 * effort, 1180 + effort * 110, 0.24, t, -0.035, 0.075);
  sound.noise(0.12 + 0.17 * effort, recovering ? 638 : 725, recovering ? 0.61 : 0.36, t + 0.25, 0.04, 0.08);
  sound.note('sine', 154, 0.013 * effort, t + 0.27, 0.22, 0, 112, 0.08);
}
export function creatureSound(sound, kind, time, pan, level, attacking = false) {
  const { noise, note } = sound;
  if (kind === 'wolf') {
    noise(level * 0.48, attacking ? 770 : 525, 0.39, time, pan, 0.035);
    note('sawtooth', attacking ? 142 : 97, level * 0.055, time, 0.36, pan, 71, 0.08);
    if (attacking) {
      noise(level * 0.38, 1380, 0.17, time + 0.07, pan, 0.012);
      note('triangle', 340, level * 0.1, time + 0.04, 0.24, pan, 215, 0.025);
    }
    return;
  }
  if (kind === 'troll') {
    note('sine', 87, level * 0.28, time, 0.41, pan, 42, 0.014);
    noise(level * 0.54, attacking ? 390 : 580, 0.33, time, pan, 0.019);
    noise(level * 0.25, attacking ? 1790 : 1270, 0.24, time + 0.09, pan);
    if (attacking) {
      note('triangle', 465, level * 0.11, time + 0.08, 0.22, pan, 313, 0.009);
      noise(level * 0.41, 2050, 0.13, time + 0.13, pan, 0.012);
    }
    return;
  }
  noise(level * 0.64, attacking ? 1470 : 580, attacking ? 0.86 : 0.46, time, pan, 0.13);
  noise(level * 0.31, attacking ? 2800 : 1030, 0.46, time + 0.22, pan * 0.88, 0.13);
  note('triangle', attacking ? 253 : 129, level * 0.09, time + 0.04, 0.64, pan, attacking ? 390 : 81, 0.13);
}
export function metalContact(sound, kind, t, pan, gain) {
  if (kind === 'wood' || kind === 'tree' || kind === 'thorns') {
    sound.noise(0.5 * gain, 1080, 0.12, t, pan, 0.004);
    sound.note('triangle', 227, 0.15 * gain, t, 0.13, pan, 118);
  } else if (['wolf', 'dragon', 'troll', 'witch', 'zombie', 'flesh', 'creature', 'body'].includes(kind)) {
    sound.noise(0.55 * gain, kind === 'dragon' ? 1460 : 620, 0.125, t, pan, 0.005);
    sound.note('triangle', 184, 0.15 * gain, t, 0.1, pan, 68, 0.005);
    if (kind === 'troll' || kind === 'dragon')
      sound.note('sine', 704, 0.077 * gain, t + 0.01, 0.16, pan, 618);
  } else if (kind === 'stone') {
    sound.noise(0.51 * gain, 1730, 0.12, t, pan, 0.006);
    sound.note('triangle', 1142, 0.11 * gain, t, 0.21, pan, 1017, 0.005);
    sound.noise(0.19 * gain, 3010, 0.08, t + 0.074, pan);
  } else {
    sound.noise(0.59 * gain, 2410, 0.11, t, pan, 0.004);
    sound.note('triangle', 1340, 0.099 * gain, t, 0.32, pan, 1190, 0.006);
    sound.note('sine', 1903, 0.068 * gain, t + 0.006, 0.25, pan, 1740, 0.006);
  }
}
export function useVial(sound, kind, t, pan, gain = 1) {
  const noise = (level, ...args) => sound.noise(level * gain, ...args);
  const note = (shape, f, level, ...args) => sound.note(shape, f, level * gain, ...args);
  if (kind === 'veil') {
    noise(0.38, 2280, 0.13, t, pan, 0.005);
    noise(0.24, 1280, 1.24, t + 0.03, pan, 0.22);
  } else if (kind === 'lure') {
    noise(0.17, 1630, 0.08, t, pan);
    [0, 0.25, 0.83, 1.87, 3.64].forEach((s, i) => {
      sound.bell(790 - i * 13, t + s, (0.12 * gain) / (1 + i * 0.35), 0.75, pan);
    });
  } else if (kind === 'sip') {
    noise(0.18, 660, 0.29, t, pan, 0.045);
    note('sine', 321, 0.045, t + 0.11, 0.19, pan, 173);
  } else if (kind === 'drink') {
    noise(0.16, 750, 0.14, t, pan);
    for (const s of [0.1, 0.34]) {
      note('sine', 388, 0.09, t + s, 0.13, pan, 156, 0.029);
      noise(0.22, 560, 0.16, t + s + 0.045, pan, 0.035);
    }
  } else if (kind === 'fill') {
    noise(0.35, 1540, 0.84, t, pan, 0.12);
    [437, 516, 637, 795].forEach((f, i) => note('sine', f * 1.19, 0.059, t + i * 0.15, 0.13, pan, f));
  } else {
    noise(0.51, 3350, 0.13, t, pan, 0.003);
    [1791, 2517, 1217, 2851].forEach((f, i) =>
      note('sine', f, 0.072, t + i * 0.034, 0.2 - i * 0.025, pan + i * 0.035, f * 0.96, 0.004)
    );
    if (kind === 'cure') {
      noise(0.22, 1800, 0.58, t + 0.07, pan);
      note('sine', 415.3, 0.054, t + 0.13, 1.3, pan);
    } else {
      noise(0.54, 850, 0.7, t + 0.06, pan, 0.095);
      note('sine', 130, 0.15, t + 0.05, 0.58, pan, 58, 0.025);
    }
  }
}
