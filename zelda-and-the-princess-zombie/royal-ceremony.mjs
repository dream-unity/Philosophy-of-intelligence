// The two paintings share one image plane with the streamers, so a tall
// screen can show the full square without cropping the king or his audience.
const shots = {
  report: {
    file: 'royal-report.webp',
    preview: 'data:image/webp;base64,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',
    description: 'In a castle chamber at dawn, Xero takes her father’s hands. He leans close to hear her.',
    speaker: 'Princess Xero',
    line: 'Father, it was Zelda. I could still hear him through the curse. He gave me back my life.',
  },
  honour: {
    file: 'royal-honours.webp',
    preview: 'data:image/webp;base64,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',
    description: 'On the royal platform, the king lifts a gold badge beside Zelda and his living daughter. Thousands of citizens fill the square and all three galleries.',
    speaker: 'The king',
    line: 'Zelda, you have given me back my daughter. People of this kingdom, remember his name. Stand with me and honour him!',
  },
};

export function royalCaption(phase, time) {
  if (phase === 'honour' && time >= 7.75) return ['The people of the kingdom', 'Zelda! Zelda!'];
  const shot = shots[phase];
  return shot ? [shot.speaker, shot.line] : null;
}

export function createRoyalCeremony(stage) {
  let sheet, art, lift, from, words, utterance, currentShot;
  const pictures = {}, ribbons = [];
  let lastFrame = -1;
  function preload() {
    if (pictures.report) return;
    for (const [id, shot] of Object.entries(shots)) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => { if (id === currentShot) art.src = image.src; };
      image.src = shot.file;
      pictures[id] = image;
    }
  }
  function makeStage() {
    sheet = document.createElement('section');
    sheet.className = 'royal-picture';
    sheet.hidden = true;
    lift = document.createElement('div');
    lift.className = 'royal-picture-plane';
    art = document.createElement('img');
    art.draggable = false;
    lift.append(art);
    // Narrow ribbons tossed by the front right-hand galleries at the acclamation.
    for (let i = 0; i < 21; i++) {
      const streamer = document.createElement('i');
      streamer.setAttribute('aria-hidden', 'true');
      streamer.className = 'royal-streamer';
      streamer.style.backgroundColor = ['#e8b45d','#818eb9','#e8c999','#b74f42','#dbcfa2'][i % 5];
      lift.append(streamer);
      ribbons.push(streamer);
    }
    utterance = document.createElement('div');
    utterance.className = 'royal-subtitle';
    utterance.setAttribute('aria-live', 'polite');
    utterance.setAttribute('aria-atomic', 'true');
    from = document.createElement('span');
    words = document.createElement('p');
    utterance.append(from, words);
    sheet.append(lift, utterance);
    stage.append(sheet);
  }
  function render(prize, reduced) {
    if (prize && !pictures.report) preload();
    const phase = prize?.phase;
    const key = phase === 'complete' ? 'honour' : phase;
    if (!shots[key]) {
      if (sheet) sheet.hidden = true;
      currentShot = undefined;
      return false;
    }
    if (!sheet) makeStage();
    sheet.hidden = false;
    if (key !== currentShot) {
      currentShot = key;
      sheet.dataset.shot = key;
      art.alt = shots[key].description;
      const pic = pictures[key];
      art.src = pic.complete && pic.naturalWidth ? pic.src : shots[key].preview;
      lastFrame = -1;
    }
    const t = phase === 'complete' ? 12 : Math.max(0, prize.time);
    utterance.hidden = phase === 'complete';
    const line = royalCaption(key, t);
    if (words.textContent !== line[1]) {
      from.textContent = line[0];
      words.textContent = line[1];
    }
    // Limit animated decoration to 20 Hz and attach it to scene time, so it
    // freezes on pause and resumes correctly after reloading mid-sentence.
    const frame = Math.floor(t * 20) + (reduced ? 10000 : 0);
    if (frame === lastFrame) return true;
    lastFrame = frame;
    const wide = key === 'honour';
    const travel = Math.min(1, t / (wide ? 11 : 8));
    lift.style.transform = reduced ? '' :
      'scale(' + (wide ? 1.027 - 0.027 * travel : 1 + 0.025 * travel).toFixed(4) + ')';
    ribbons.forEach((ribbon, i) => {
      const age = t - 7.25 - (i % 7) * 0.23 - Math.floor(i / 7) * 0.62;
      const visible = !reduced && wide && age >= 0 && age < 2.05;
      ribbon.hidden = !visible;
      if (!visible) return;
      const x = 71 + (i * 13 % 29) - age * (3.8 + i % 6) + Math.sin(age * 5 + i) * 0.65;
      const y = 75 + i % 8 - (34 + i % 9) * age + 18 * age ** 2;
      ribbon.style.left = x.toFixed(2) + '%';
      ribbon.style.top = y.toFixed(2) + '%';
      ribbon.style.transform = 'rotate(' + (i * 37 + age * (210 + i * 4)).toFixed(0) + 'deg) scaleX(' +
        (0.25 + Math.abs(Math.sin(age * 6 + i)) * 0.75).toFixed(2) + ')';
    });
    return true;
  }
  return { render, preload };
}
