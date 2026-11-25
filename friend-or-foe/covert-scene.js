// Both sets of carriers share one room. The upper bank runs along the ceiling
// and the lower bank along the floor, so approaching cards can grow without
// covering the names on the other bank.
const REAR_SPACING = 0.164;
const FRONT_SPACING = 0.188;
const BANK_OFFSET = 0.016;
const FLOOR_START = 0.635;
const FLOOR_TRAVEL = 0.208;

function laneX(slot, depth) {
  const column = slot % 5 - 2;
  const bank = slot < 5 ? -BANK_OFFSET : BANK_OFFSET;
  return 0.5 + bank + column * (REAR_SPACING + (FRONT_SPACING - REAR_SPACING) * depth);
}

export function targetBounds(width, height, target) {
  const depth = Math.min(1, target.elapsed / target.duration);
  const suspended = target.slot < 5;
  const cx = width * (laneX(target.slot, depth) + target.offsetX * 0.003);
  const baseY = suspended ? 0.418 - 0.108 * depth : FLOOR_START + FLOOR_TRAVEL * depth;
  const floor = Math.round(height * (baseY + 0.004 * target.offsetY));
  const size = Math.max(12, Math.round(Math.min(height * 0.345, width * 0.193) * (0.46 + 0.54 * depth)));
  const railY = Math.round(height * (0.211 - depth * 0.165));
  return {
    x: Math.round(cx - size / 2), y: Math.round(floor - size * 16 / 19) - 2,
    w: size, h: size, floor, railY, suspended
  };
}

function line(ctx, x1, y1, x2, y2, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
}

function face(ctx, points, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index) ctx.lineTo(Math.round(x), Math.round(y));
    else ctx.moveTo(Math.round(x), Math.round(y));
  });
  ctx.closePath();
  ctx.fill();
}

function room(ctx, w, h) {
  const left = w * 0.162, right = w - left;
  const top = h * 0.203, base = h * 0.548;
  ctx.fillStyle = '#1a3038';
  ctx.fillRect(0, 0, w, h);

  // A boxed-in backstop and two side walls meet along the perspective seams.
  face(ctx, [[0,0],[left,top],[left,base],[0,h*0.851]], '#22373c');
  face(ctx, [[w,0],[right,top],[right,base],[w,h*0.851]], '#263a3d');
  face(ctx, [[0,0],[w,0],[right,top],[left,top]], '#20333b');
  face(ctx, [[0,h*0.851],[left,base],[right,base],[w,h*0.851],[w,h],[0,h]], '#2a3a3b');

  // The sparse, painted skyline is scenery. The moving cutouts carry all the
  // bright pigments and nameplates.
  const artTop = Math.round(top + h * 0.036);
  const artH = Math.round(base - artTop - h * 0.035);
  const artLeft = Math.round(left + w * 0.014), artRight = Math.round(right - w * 0.014);
  ctx.fillStyle = '#293f47';
  ctx.fillRect(artLeft, artTop, artRight - artLeft, artH);
  const heights = [3,5,4,7,6,2,4,3,6,3,4,2,5,7,5,4,6,4,3,5,6,3,5,4];
  const step = (artRight - artLeft) / heights.length;
  for (let i = 0; i < heights.length; i++) {
    const x = Math.round(artLeft + i * step);
    const roof = Math.round(artTop + artH * (1 - heights[i] / 8));
    ctx.fillStyle = i % 3 === 0 ? '#1a303b' : '#203640';
    ctx.fillRect(x, roof, Math.ceil(step) - 1, artTop + artH - roof);
    if (i % 5 === 2) line(ctx, x + 2, roof, x + 2, roof - 3, '#1a303b');
    ctx.fillStyle = i % 4 === 0 ? '#6e6a55' : '#3d5459';
    for (let windowY = roof + 3; windowY < artTop + artH - 1; windowY += 5) {
      ctx.fillRect(x + 2, windowY, 1, 1);
      if (i % 2 && step > 6) ctx.fillRect(x + 5, windowY, 1, 1);
    }
  }
  for (let division = 0; division <= 4; division++) {
    const x = artLeft + division * (artRight - artLeft) / 4;
    line(ctx, x, artTop, x, artTop + artH, '#263b42');
  }
  line(ctx, left, top, right, top, '#53666a');
  line(ctx, left, base, right, base, '#0f232a');
  line(ctx, left, base + 1, right, base + 1, '#4c5b58');

  for (const side of [-1, 1]) {
    const edge = side < 0 ? 0 : w;
    const inner = side < 0 ? left : right;
    const at = depth => inner + (edge - inner) * depth;
    line(ctx, edge, 0, inner, top, '#6b7773');
    line(ctx, edge, h * 0.852, inner, base, '#101f24');
    line(ctx, edge, h * 0.83, inner, base - h * 0.009, '#51615d');
    for (const depth of [0.18, 0.48, 0.84]) {
      const x = at(depth);
      const ceiling = top * (1 - depth);
      const floor = base + h * 0.303 * depth;
      line(ctx, x, ceiling, x, floor, '#162a30');
      line(ctx, x - side, ceiling + 1, x - side, floor - 2, '#35484a');
    }
    // A few inset acoustic slats echo the oblique angle of the walls.
    for (let i = 0; i < 3; i++) {
      const x1 = at(0.55), x2 = at(0.78);
      line(ctx, x1, h * (0.28 + i * 0.018), x2, h * (0.25 + i * 0.024), '#172a2e');
    }
    line(ctx, edge, h * 0.14, inner, top + h * 0.047, '#3c5052');
  }

  // Recessed ceiling beams and paired warm lamps lead the eye down the hall.
  for (const [y, inset, halfLight] of [[0.024, 0.022, 0.039],[0.101, 0.089, 0.030],[0.165, 0.14, 0.022]]) {
    line(ctx, w * inset, h * y, w * (1 - inset), h * y, '#13262d');
    line(ctx, w * inset, h * y + 1, w * (1 - inset), h * y + 1, '#3a4f54');
    for (const center of [0.34 + inset / 3, 0.66 - inset / 3]) {
      line(ctx, w * (center - halfLight), h * y, w * (center + halfLight), h * y, '#716f59');
      line(ctx, w * (center - halfLight) + 1, h * y + 1, w * (center + halfLight) - 1, h * y + 1, '#ddd4a2');
    }
  }

  // Floor expansion joints terminate at the side walls.
  for (const y of [0.589, 0.652, 0.758, 0.898]) {
    const inset = left * Math.max(0, 1 - (y - 0.548) / 0.303);
    line(ctx, inset, h * y, w - inset, h * y, '#354445');
  }
  for (const delta of [-0.54, -0.32, -0.12, 0.12, 0.32, 0.54]) {
    line(ctx, w*(0.5 + delta * 0.48), base + 2, w*(0.5 + delta), h, '#233236');
  }
}

function guideRails(ctx, w, h) {
  for (let slot = 0; slot < 10; slot++) {
    const overhead = slot < 5;
    const yFar = overhead ? 0.205 : 0.55;
    const yNear = overhead ? 0 : 1;
    const depthAt = y => overhead ? (0.211 - y) / 0.165 : (y - FLOOR_START) / FLOOR_TRAVEL;
    const xFar = w * laneX(slot, depthAt(yFar));
    const xNear = w * laneX(slot, depthAt(yNear));
    const half = Math.max(1, Math.round(w * 0.003));
    line(ctx, xFar - 1, h*yFar, xNear - half, h*yNear, overhead ? '#11252c' : '#18292d');
    line(ctx, xFar + 1, h*yFar, xNear + half, h*yNear, overhead ? '#4f6367' : '#5a6864');
  }
  // One striped threshold marks the player end of the room.
  const y = Math.round(h * 0.844);
  const dash = Math.max(4, Math.round(w * 0.019));
  line(ctx, 0, y-1, w, y-1, '#1c2b2d');
  for (let x = 0; x < w; x += 2*dash) {
    line(ctx, x, y, x+dash, y, '#a09069');
  }
}

export function drawStage(ctx, width, height) {
  room(ctx, width, height);
  guideRails(ctx, width, height);
}

const digits = [
  [' # ','## ',' # ',' # ','###'], ['###','  #','###','#  ','###'],
  ['###','  #',' ##','  #','###'], ['# #','# #','###','  #','  #'],
  ['###','#  ','###','  #','###'], ['###','#  ','###','# #','###'],
  ['###','  #','  #',' # ',' # '], ['###','# #','###','# #','###'],
  ['###','# #','###','  #','###'], ['###','# #','# #','# #','###']
];

export function drawTrolley(ctx, box, sprite, slot) {
  const cx = Math.round(box.x + box.w / 2);
  const half = Math.max(4, Math.round(box.w * 0.19));
  if (box.suspended) {
    const hangerY = box.y + Math.round(box.h * 0.48);
    line(ctx, cx, box.railY + 1, cx, hangerY, '#a59675');
    ctx.fillStyle = '#101f25';
    ctx.fillRect(cx - 3, box.railY - 2, 7, 4);
    ctx.fillStyle = '#a4afa3';
    ctx.fillRect(cx - 2, box.railY - 1, 4, 1);
  } else {
    ctx.fillStyle = '#18282a';
    ctx.fillRect(cx - half - 2, box.floor - 1, half*2 + 6, 3);
    ctx.fillStyle = '#627372';
    ctx.fillRect(cx - half, box.floor - 2, half*2, 2);
  }
  line(ctx, cx, box.floor - 5, cx, box.floor + 1, '#ab9b80');
  ctx.drawImage(sprite, box.x, box.y, box.w, box.h);
  ctx.fillStyle = '#1a282c';
  ctx.fillRect(cx - 3, box.floor - 3, 7, 6);
  ctx.fillStyle = '#e4d7ab';
  digits[slot].forEach((row, y) => [...row].forEach((mark, x) => {
    if (mark === '#') ctx.fillRect(cx - 1 + x, box.floor - 3 + y, 1, 1);
  }));
}

// Tiny hand-painted arcade pulse projector anchored to the player's side of
// the glass. Its recoil and colours are identical for every shot.
export function drawProjector(ctx, width, height, aimX, pulseTime) {
  const scale = Math.min(width / 290, height / 205);
  const cx = Math.round(width * (0.52 + 0.06 * (aimX - 0.5)));
  const recoil = Math.round(Math.min(1, pulseTime / 0.22) * 4 * scale);
  const top = Math.round(height - 18 * scale + recoil);
  const points = coords => coords.map(([x,y]) => [cx + x*scale, top + y*scale]);
  const panel = (coords, colour) => face(ctx, points(coords), colour);
  const stripe = (x1,y1,x2,y2,colour) => line(ctx, cx+x1*scale,top+y1*scale,cx+x2*scale,top+y2*scale,colour);
  panel([[-19,20],[-15,12],[-9,9],[-7,5],[-4,3],[4,3],[8,6],[10,9],[16,12],[19,20]], '#101e25');
  panel([[-15,20],[-13,13],[-7,10],[7,10],[14,14],[16,20]], '#627477');
  panel([[-9,20],[-6,11],[5,11],[10,20]], '#344e59');
  panel([[-6,10],[-6,5],[-4,0],[3,0],[6,4],[6,10],[3,13],[-3,13]], '#20313b');
  panel([[-4,5],[-3,2],[2,2],[4,5],[3,8],[-3,8]], pulseTime > 0.13 ? '#fff0c5' : '#b7ddce');
  stripe(-3,3,2,3,'#d1ead8');
  stripe(-3,7,3,7,'#6dada5');
  stripe(-11,13,-8,12,'#d3ac75');
  stripe(7,12,11,14,'#b89c74');
  stripe(-13,17,-10,16,'#31444b');
}
