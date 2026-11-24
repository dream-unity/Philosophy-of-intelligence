// Flat colours, a small pixel buffer and integer drawing keep the range in the
// same visual register as the site's other arcade games.
const ink = '#101a20';
const line = '#315455';
const dim = '#203b3e';
const mint = '#92e4d0';
const orange = '#ff9c75';

const figures = {
  cyclops: [
    '  p    p    p  ',
    '   pp ppp pp   ',
    '   ppppppppp   ',
    '  pppwwwppppp  ',
    ' ppwwwwwwwpppp ',
    ' ppwwwiiwwwppp ',
    '  ppwwiiwwppp  ',
    '  pppwwwwpppp  ',
    ' ppppppppppppp ',
    ' pp ppppppp pp ',
    '    pp   pp    ',
    '   ppp   ppp   '
  ],
  stalker: [
    ' www       www ',
    'wiww  www  wwiw',
    ' ppp wiww   pp ',
    '   pp pp   pp  ',
    '    pp p  pp   ',
    '     pppppp    ',
    '    pppppppp   ',
    '   ppwwwwwppp  ',
    '  pppppppppppp ',
    '   ppppppp pp  ',
    '   pp   ppp    ',
    '  ppp    ppp   '
  ],
  reader: [
    '  ppp     ppp  ',
    '   ppppppppp   ',
    '   ppwwwppppp  ',
    '  ppwiwwwwiwwp ',
    '   ppwwppwwpp  ',
    '     pppppp    ',
    '  www   p  www ',
    '  wppw wwwpppw ',
    ' ppwppwiwpppwpp',
    '   wppwiwppw   ',
    '    ww   ww    ',
    '   ppp   ppp   '
  ],
  moth: [
    ' p     p p   p ',
    ' pp     p   pp ',
    ' ppp  pppp ppp ',
    '  ppppiwwippp  ',
    '  pppwwwwwwpp  ',
    ' ppwpppppppwpp ',
    'ppwwpppppppwwpp',
    'pppp  ppp  pppp',
    ' pp   ppp   pp ',
    '       p       '
  ],
  crab: [
    ' pp         pp ',
    ' pp p     p pp ',
    ' pppp www pppp ',
    '  pp wiwiw pp  ',
    '   ppppppppp   ',
    ' pppppwwwppppp ',
    'pp ppppppppp pp',
    '  pp ppppp pp  ',
    ' pp  p   p  pp ',
    'pp  pp   pp  pp'
  ]
};
const pigments = {cyclops: '#9baadc', stalker: '#d5af78', reader: '#abbf99', moth: '#c0a1c9', crab: '#b4b1db'};

const marks = {
  friend: [' ## ## ', '#######', '#######', ' ##### ', '  ###  ', '   #   '],
  foe:    ['##   ##', '### ###', ' ##### ', '  ###  ', ' ##### ', '### ###', '##   ##']
};

function lineTo(ctx, x1, y1, x2, y2, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
}

function stamp(ctx, rows, x, y, pixel, palette) {
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const colour = palette[rows[row][col]];
      if (colour) {
        ctx.fillStyle = colour;
        ctx.fillRect(x + col * pixel, y + row * pixel, pixel, pixel);
      }
    }
  }
}

// Target art is always drawn on this same solid, clickable 25 x 30 placard.
export function drawPlacard(ctx, target) {
  const signal = target.role === 'foe' ? orange : mint;
  ctx.fillStyle = '#0b151b';
  ctx.fillRect(0, 1, 25, 28);
  ctx.fillRect(1, 0, 23, 30);
  ctx.fillStyle = '#667878';
  ctx.fillRect(2, 0, 21, 1);
  ctx.fillRect(0, 2, 1, 26);
  ctx.fillStyle = '#394a50';
  ctx.fillRect(24, 2, 1, 26);
  ctx.fillRect(2, 29, 21, 1);
  ctx.fillStyle = '#1e3037';
  ctx.fillRect(2, 2, 21, 16);
  const body = figures[target.species];
  stamp(ctx, body, 5, 16 - body.length, 1, {p: pigments[target.species], w: '#dfe7d4', i: ink});
  ctx.fillStyle = target.role === 'foe' ? '#412d2c' : '#1f3b39';
  ctx.fillRect(2, 19, 21, 9);
  stamp(ctx, marks[target.role], 9, 20, 1, {'#': signal});
  ctx.fillStyle = signal;
  ctx.fillRect(2, 20, 1, 7);
  ctx.fillRect(22, 20, 1, 7);
}

export function targetRect(width, height, lane, progress) {
  // Perspective compresses the far end; both the carrier and its shadow follow the same rail.
  const distance = 0.65 * progress + 0.35 * progress * progress;
  const depth = 0.18 + 0.82 * distance;
  const maxH = Math.min(height * 0.49, width * 0.39);
  const h = Math.max(19, Math.round(maxH * (0.24 + 0.76 * distance)));
  const w = Math.round(h * 25 / 30);
  const floor = Math.round(height * (0.46 + 0.45 * depth));
  const post = Math.max(2, Math.round(h * 0.09));
  const x = Math.round(width * (0.5 + lane * 0.32 * depth) - w / 2);
  return {x, y: floor - h - post, w, h, floor, post};
}

export function inTarget(rect, x, y, padding = 0) {
  return x >= rect.x - padding && x <= rect.x + rect.w + padding &&
    y >= rect.y - padding && y <= rect.y + rect.h + padding;
}

export function drawRange(ctx, width, height) {
  const cx = width * 0.5;
  const horizon = height * 0.46;
  ctx.fillStyle = '#111e25';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#172c33';
  ctx.fillRect(width * 0.19, height * 0.19, width * 0.62, height * 0.27);

  // The distant painted city and its lit windows are a few rectangles.
  const skyline = [3, 5, 7, 4, 6, 3, 4, 2, 3, 2, 1, 2, 4, 3, 6, 5, 3, 7, 4, 5];
  const step = width * 0.62 / skyline.length;
  skyline.forEach((levels, i) => {
    const x = Math.floor(width * 0.19 + i * step);
    const top = Math.floor(horizon - levels * height * 0.017);
    ctx.fillStyle = i % 2 ? '#213a40' : '#253e43';
    ctx.fillRect(x, top, Math.max(2, Math.ceil(step) - 1), Math.ceil(horizon - top));
    ctx.fillStyle = i % 3 ? '#547272' : '#aa946f';
    for (let k = 0; k < levels - 1; k += 2) {
      ctx.fillRect(x + Math.floor(step * 0.33), Math.round(top + (k + 0.6) * height * 0.017), 2, 1);
    }
  });

  // Ceiling baffles and side wall seams share the floor's vanishing point.
  for (const edge of [-1, 1]) {
    for (const depth of [0.47, 0.64, 0.90]) {
      const x = cx + edge * width * depth;
      lineTo(ctx, x, 0, cx + (x - cx) * 0.36, height * 0.24, dim);
    }
    const outer = edge === -1 ? 0 : width;
    const inner = cx + edge * width * 0.31;
    lineTo(ctx, outer, height * 0.06, inner, height * 0.24, line);
    lineTo(ctx, inner, height * 0.24, inner, horizon, line);
    lineTo(ctx, outer, height * 0.79, inner, horizon, line);
    for (const d of [0.25, 0.59]) {
      const x = inner + (outer - inner) * d;
      lineTo(ctx, x, height * (0.24 - d * 0.18), x, height * (0.46 + d * 0.33), dim);
    }
  }
  for (const d of [0.26, 0.49, 0.79]) {
    const y = Math.round(horizon * (1 - d));
    const length = Math.round(width * d * 0.13);
    lineTo(ctx, cx - length, y - 1, cx + length, y - 1, '#506662');
    lineTo(ctx, cx - length, y, cx + length, y, '#b0b79a');
  }
  ctx.fillStyle = '#14272a';
  ctx.fillRect(0, Math.round(horizon), width, height - Math.round(horizon));
  lineTo(ctx, 0, horizon, width, horizon, line);
  for (const d of [0.09, 0.17, 0.29, 0.46, 0.69, 0.98]) {
    const y = horizon + height * 0.54 * d;
    lineTo(ctx, 0, y, width, y, '#274041');
  }
  for (const lane of [-1, 0, 1]) {
    for (const offset of [-0.025, 0.025]) {
      const end = cx + (lane * 0.32 + offset) * width * 1.2;
      lineTo(ctx, cx, horizon, end, height, line);
    }
  }
  for (const x of [0.04, 0.96]) {
    lineTo(ctx, cx, horizon, (x < 0.5 ? -0.14 : 1.14) * width, height, dim);
  }
  // A dashed arrival line remains visible below the closest placard.
  const finishY = Math.round(height * 0.924);
  const dash = Math.max(4, Math.round(width / 50));
  ctx.fillStyle = '#8a785d';
  for (let x = 0; x < width; x += dash * 2) ctx.fillRect(x, finishY, dash, 1);
}

export function drawCarrier(ctx, rect, sprite, folded = 0) {
  const mid = Math.round(rect.x + rect.w / 2);
  const postW = Math.max(1, Math.round(rect.w * 0.06));
  ctx.fillStyle = '#0b181b';
  ctx.fillRect(mid - rect.w * 0.4, rect.floor, rect.w * 0.83, Math.max(2, rect.post * 0.38));
  ctx.fillStyle = '#647574';
  ctx.fillRect(mid - postW / 2, rect.floor - rect.post, postW, rect.post);
  ctx.fillStyle = '#83938c';
  ctx.fillRect(mid - rect.w * 0.19, rect.floor - 1, rect.w * 0.38, 2);
  const visibleH = Math.round(rect.h * (1 - folded));
  if (visibleH > 0) {
    ctx.drawImage(sprite, rect.x, rect.y + rect.h - visibleH, rect.w, visibleH);
  }
}

export function drawSight(ctx, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  for (const [colour, size] of [['#091419', 3], ['#f4efcd', 1]]) {
    ctx.fillStyle = colour;
    const n = (size - 1) / 2;
    ctx.fillRect(x - 8, y - n, 5, size);
    ctx.fillRect(x + 4, y - n, 5, size);
    ctx.fillRect(x - n, y - 8, size, 5);
    ctx.fillRect(x - n, y + 4, size, 5);
    ctx.fillRect(x - n, y - n, size, size);
  }
}
