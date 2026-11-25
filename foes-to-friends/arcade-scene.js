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
  ],
  drifter: [
    '      ppp      ',
    '    pwwwwwp    ',
    '   pwiwwwwwp   ',
    '  pwwwpppwwwp  ',
    ' ppppppppppppp ',
    ' pppwpppppwppp ',
    '   p  p p  p   ',
    '  pp pp pp pp  ',
    ' pp  pp  p  pp ',
    '  p   p   p  p ',
  ],
  beetle: [
    '  p         p  ',
    '   pp     pp   ',
    '    ppwwwpp    ',
    '     wiiiw     ',
    '  pppppwppppp  ',
    ' ppppppwpppppp ',
    'pp ppppwpppp pp',
    '  pppppwppppp  ',
    ' pp pppwppp pp ',
    'pp   ppppp   pp',
    '     p   p     ',
  ],
  canbot: [
    '       w       ',
    '       p       ',
    '   ppppppppp   ',
    '   pwwwwwwwp   ',
    '  ppwiwiwiwpp  ',
    '   ppppppppp   ',
    ' ppp ppppp ppp ',
    ' pwpppppppppwp ',
    ' pp  pwwwp  pp ',
    '     pp pp     ',
    '    ppp ppp    ',
  ],
  comet: [
    'p              ',
    'pp  p          ',
    ' ppppp p       ',
    '  ppwwppp      ',
    '   ppwwpppp    ',
    '    pppppppp   ',
    '     ppwwwwwp  ',
    '      pwiwwwwp ',
    '      ppwwwppp ',
    '       pppppp  ',
    '        pppp   ',
  ],
  slug: [
    '         ww ww ',
    '         wi wi ',
    '          p p  ',
    '          pppp ',
    '    pppp ppppp ',
    '   pwwwppppppp ',
    '  pwwpiwppppp  ',
    '  pwwppwpppp   ',
    ' pppwwwppppp   ',
    'pppppppppppppp ',
    ' pppwwwppwwwppp',
  ]
};
export const SPECIES = Object.keys(figures);
const inks = ['#d48e9b','#79cfae','#e1ba7b','#c0a1ed','#9ab9ef',
  '#7bd2ce','#dfa974','#a1c8db','#ef9d79','#a6c88c'];
const GRID = 19;
const masks = Object.fromEntries(SPECIES.map(species => {
  const rows = figures[species];
  const y0 = 16 - rows.length;
  const mask = Array.from({length: GRID}, () => Array(GRID).fill(' '));
  rows.forEach((row, y) => [...row].forEach((mark, x) => {mask[y + y0][2 + x] = mark;}));
  return [species, mask];
}));

export function drawCutout(ctx, species) {
  const mask = masks[species];
  const colours = {w: '#f4f2ce', i: '#242936', p: inks[SPECIES.indexOf(species)]};
  const solid = (x,y) => mask[y]?.[x] && mask[y][x] !== ' ';
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const inside = solid(x,y);
      if (!inside && !solid(x-1,y) && !solid(x+1,y) && !solid(x,y-1) && !solid(x,y+1)) continue;
      ctx.fillStyle = inside ? colours[mask[y][x]] : '#28393e';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function targetBounds(width, height, target) {
  const p = Math.min(1, target.elapsed / target.duration);
  const q = (0.65 + 0.35*p)*p;
  const col = target.slot % 5;
  const lower = target.slot >= 5;
  const cx = width * (.5 + (col-2) * (.168 + .026*q) + .006 * target.offsetX);
  const floor = Math.round(height * ((lower ? .69 : .27) + q*.16 + .006*target.offsetY));
  const size = Math.max(10, Math.round(Math.min(height*.36, width*.202) * (.65+.35*q)));
  return {x: Math.round(cx-size/2), y: Math.round(floor-size*16/19)-2, w: size, h: size, floor};
}

export function hitCutout(bounds, species, x, y, pad = 0) {
  const mask = masks[species];
  const ix = Math.floor((x-bounds.x)*GRID/bounds.w);
  const iy = Math.floor((y-bounds.y)*GRID/bounds.h);
  // Include the single-pixel cut edge and allow touch near the artwork.
  const radius = Math.min(2, 1+Math.floor(pad*GRID/bounds.w));
  for (let dy=-radius;dy<=radius;dy++) for (let dx=-radius;dx<=radius;dx++) {
    const mark = mask[iy+dy]?.[ix+dx];
    if (mark && mark !== ' ') return true;
  }
  return false;
}

const digits = [
  [' # ','## ',' # ',' # ','###'], ['###','  #','###','#  ','###'],
  ['###','  #',' ##','  #','###'], ['# #','# #','###','  #','  #'],
  ['###','#  ','###','  #','###'], ['###','#  ','###','# #','###'],
  ['###','  #','  #',' # ',' # '], ['###','# #','###','# #','###'],
  ['###','# #','###','  #','###'], ['###','# #','# #','# #','###']
];

function line(ctx, x1,y1,x2,y2,colour) {
  ctx.strokeStyle=colour;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);
  ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);
  ctx.stroke();
}

export function drawTrolley(ctx, r, sprite, slot) {
  const mid = Math.round(r.x+r.w/2);
  const base = Math.max(5, Math.round(r.w*.30));
  ctx.fillStyle='#0c151b';
  ctx.fillRect(mid-base-1,r.floor-2,base*2+2,4);
  ctx.fillStyle='#4b6666';
  ctx.fillRect(mid-base,r.floor-2,base*2,1);
  ctx.fillStyle='#a4b1a1';
  ctx.fillRect(mid-1,r.floor-5,2,4);
  ctx.drawImage(sprite, r.x,r.y,r.w,r.h);
  ctx.fillStyle='#152328';
  ctx.fillRect(mid-3,r.floor-3,7,6);
  ctx.fillStyle='#e1d2a9';
  digits[slot].forEach((row,y) => [...row].forEach((mark,x) => {
    if (mark==='#') ctx.fillRect(mid-1+x,r.floor-3+y,1,1);
  }));
}

export function drawStage(ctx,w,h) {
  ctx.fillStyle='#101c25';
  ctx.fillRect(0,0,w,h);
  const horizon=h*.24;
  // A painted skyline behind the upper rail and little paired marquee lamps.
  const skyline=[3,5,6,2,1,3,4,5,3,2,1,2,3,5,4,2,3,6,4,3,5,2];
  const step=w/skyline.length;
  skyline.forEach((v,i) => {
    const x=Math.floor(i*step);
    const y=Math.floor(horizon-v*h*.023);
    ctx.fillStyle=i%2?'#1d343c':'#233c43';
    ctx.fillRect(x,y,Math.ceil(step)-1,Math.ceil(horizon-y));
    ctx.fillStyle=i%4?'#3c5b5e':'#706a55';
    for (let j=0;j<v-1;j+=2) ctx.fillRect(x+4, Math.round(y+(j+.6)*h*.023),2,1);
  });
  ctx.fillStyle='#1d3138';
  ctx.fillRect(0,0,w,Math.max(3,Math.round(h*.025)));
  for (const x of [.08,.29,.5,.71,.92]) {
    line(ctx,w*x-4,1,w*x+4,1,'#b5a77e');
  }
  for (const top of [.24,.66]) {
    const near=top+.24;
    ctx.fillStyle='#192f34';
    ctx.fillRect(0,Math.round(h*top),w,Math.ceil(h*(near-top)));
    line(ctx,0,h*top,w,h*top,'#3d5a5d');
    for (const level of [.13,.32,.63,.98]) {
      const y=h*(top+(near-top)*level);
      line(ctx,0,y,w,y,'#244046');
    }
    for (let col=-2;col<=2;col++) {
      for (const edge of [-1,1]) {
        const x0=w*(.5+col*.163+edge*.004);
        const x1=w*(.5+col*.202+edge*.011);
        line(ctx,x0,h*top,x1,h*near,edge===1?'#4d6664':'#364e50');
      }
    }
    ctx.fillStyle='#0d1a20';
    ctx.fillRect(0,Math.round(h*near),w,Math.max(3,h*.025));
    const dash=Math.max(3,Math.round(w*.025));
    for (let x=0;x<w;x+=2*dash) {
      ctx.fillStyle='#80745e';
      ctx.fillRect(x,Math.round(h*near),dash,1);
    }
  }
  // Recessed panel behind the second tier.
  const front=h*.515;
  for (const x of [.04,.22,.4,.6,.78,.96]) {
    line(ctx,w*x,front,w*x,h*.65,'#243c43');
    line(ctx,w*x+2,front+2,w*x+5,front+2,'#6b756c');
  }
  line(ctx,0,h*.966,w,h*.966,'#32474a');
}
