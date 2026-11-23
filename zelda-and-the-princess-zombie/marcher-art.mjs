import { actorWarp } from './creature-motion.mjs';
const cache = new WeakMap();
// Eight permanent gait phases for each different guest. Reuse the illustrated
// pose among nearby marchers instead of resampling its six moving patches per guest.
export function marcherFrame(image, rig, t, height) {
  let frames = cache.get(image);
  if (!frames) {
    frames = new Map();
    cache.set(image, frames);
  }
  const phase = t * 4.7 + rig.phase * 1.76,
    index = ((Math.floor((phase * 8) / (Math.PI * 2)) % 8) + 8) % 8;
  const size = height > 180 ? 240 : height > 68 ? 128 : 56,
    reach = Math.round((rig.reach || 0) * 3),
    key = index + size + reach * 512;
  if (frames.has(key)) return frames.get(key);
  const cv = document.createElement('canvas'),
    iw = image.naturalWidth || image.width,
    ih = image.naturalHeight || image.height;
  cv.height = size;
  cv.width = Math.max(2, Math.round((size * iw) / ih));
  const c = cv.getContext('2d'),
    at = (index * Math.PI * 2) / (8 * 4.7),
    actor = { type: 'marcher', phase: 0, reach: reach / 3 };
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 2; col++) {
      const u = col / 2,
        v = row / 3,
        a = actorWarp(actor, at, u, v),
        b = actorWarp(actor, at, u + 0.5, v),
        d = actorWarp(actor, at, u, v + 1 / 3);
      c.setTransform(
        (b[0] - a[0]) * cv.width,
        (b[1] - a[1]) * size,
        (d[0] - a[0]) * cv.width,
        (d[1] - a[1]) * size,
        a[0] * cv.width,
        a[1] * size
      );
      c.drawImage(image, u * iw, v * ih, iw / 2, ih / 3, 0, 0, 1.015, 1.015);
    }
  frames.set(key, cv);
  return cv;
}

const sheets = new WeakMap();
// Crop each costume once for the software painter. Keeping the cell separate
// also prevents the adjoining character bleeding in at the edge of a close-up.
export function costumeCell(sheet, kind) {
  let cells = sheets.get(sheet);
  if (!cells) { cells = new Map(); sheets.set(sheet, cells); }
  if (cells.has(kind)) return cells.get(kind);
  const width = sheet.naturalWidth / 4, height = sheet.naturalHeight / 2;
  const tile = document.createElement('canvas');
  tile.width = width;
  tile.height = height;
  tile.getContext('2d').drawImage(sheet, kind % 4 * width, Math.floor(kind / 4) * height,
    width, height, 0, 0, width, height);
  cells.set(kind, tile);
  return tile;
}
