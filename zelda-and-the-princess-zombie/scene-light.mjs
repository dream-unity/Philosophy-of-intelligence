import { witchLanternPoint } from './witch-body.mjs';
import { terrainHeight } from './geography.mjs';
// Point emitters are fixed to the fixtures in the world. The same squared
// falloff lights masonry, moving bodies, the blade and the player's fingers.
const fixtures = [
  [-5.81, 6.6, 1.77, 5.4],
  [5.81, 9.4, 1.77, 5.4],
  [24.4, 1433.9, 3.1, 5.2],
  [35.6, 1433.9, 3.1, 5.2],
  [27.35, 1516.8, 2.5, 5.7],
  [34.5, 1518.5, 2.7, 5.8],
  [18.4, 1492, 2.6, 5.1],
  [41.5, 1495, 2.5, 5.1],
].map(([x, z, h, r]) => [x, terrainHeight(x, z) + h, z, r]);
const none = [0, -100, 0, 0];
export function sceneLights(w, t) {
  const p = w.player,
    all = [];
  for (const l of fixtures) if (Math.abs(l[0] - p.x) < 66 && Math.abs(l[2] - p.z) < 66) all.push(l);
  const witch = w.actors?.find((a) => a.alive && a.type === 'witch');
  if (witch && Math.hypot(p.x - witch.x, p.z - witch.z) < 19) {
    const point = witchLanternPoint(w, witch, t, terrainHeight(witch.x, witch.z));
    all.push([...point, 4.4]);
  }
  const a = w.phialFlight;
  if (a) all.push([a.x, a.y, a.z, 3.3]);
  for (const impact of [w.lastBellImpact, w.rescueImpact]) {
    if (impact && t >= impact.at && t < impact.at + 1.15)
      all.push([impact.x, impact.y, impact.z, 7.8 * (1 - (t - impact.at) / 1.15)]);
  }
  const c = w.cinder;
  if (c && t >= c.at && t < c.at + 1.15) all.push([c.x, terrainHeight(c.x, c.z) + 0.77, c.z, 8.7 * (1 - (t - c.at) / 1.15)]);
  all.sort((a, b) => (a[0] - p.x) ** 2 + (a[2] - p.z) ** 2 - (b[0] - p.x) ** 2 - (b[2] - p.z) ** 2);
  return [all[0] || none, all[1] || none, all[2] || none];
}
const cut = (x) => Math.max(0, Math.min(1, x));
export function illumination(lights, x, y, z) {
  let warm = 0;
  for (const [lx, ly, lz, r] of lights)
    if (r > 0) warm += cut(1 - ((lx - x) ** 2 + (ly - y) ** 2 + (lz - z) ** 2) / (r * r)) ** 2;
  return Math.min(1.25, warm);
}
export const lightShader = `
uniform vec4 uLamp0,uLamp1,uLamp2;
float lamp(vec3 p,vec4 l){vec3 delta=p-l.xyz;float strength=max(0.,1.-dot(delta,delta)/max(.001,l.w*l.w));return l.w>0.?strength*strength:0.;}
vec3 lightSurface(vec3 ink,vec3 p){
 float intensity=min(1.25,lamp(p,uLamp0)+lamp(p,uLamp1)+lamp(p,uLamp2));
 bool inside=p.z>1466.&&p.z<1530.&&p.x>8.&&p.x<52.;
 vec3 ambient=inside?vec3(.72,.70,.75):vec3(.98,.98,.97);
 return ink*ambient+ (vec3(.23,.126,.035)+ink*vec3(.28,.14,.008))*intensity;}`;
export function bindLamps(gl, program, lights) {
  for (let i = 0; i < 3; i++) gl.uniform4f(program.uni['uLamp' + i], ...lights[i]);
}
const lit = new WeakMap();
export function illuminatedSprite(image, lights, x, y, z, height, night = false) {
  const bottom = illumination(lights, x, y, z),
    top = illumination(lights, x, y + height, z);
  if (!night && Math.max(bottom, top) < 0.07) return image;
  const lo = Math.round(bottom * 6),
    hi = Math.round(top * 6),
    k = lo * 16 + hi + (night ? 256 : 0);
  let frames = lit.get(image);
  if (!frames) {
    frames = new Map();
    lit.set(image, frames);
  }
  if (frames.has(k)) return frames.get(k);
  const cv = document.createElement('canvas'),
    iw = image.naturalWidth || image.width,
    ih = image.naturalHeight || image.height;
  const factor = Math.min(1, 560 / Math.max(iw, ih));
  cv.width = Math.max(1, Math.round(iw * factor));
  cv.height = Math.max(1, Math.round(ih * factor));
  const c = cv.getContext('2d');
  c.drawImage(image, 0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'source-atop';
  if (night) {
    c.fillStyle = 'rgba(19,15,29,.27)';
    c.fillRect(0, 0, cv.width, cv.height);
  }
  if (lo || hi) {
    const gradient = c.createLinearGradient(0, 0, 0, cv.height);
    for (const [offset, level] of [
      [0, hi],
      [1, lo],
    ])
      gradient.addColorStop(offset, 'rgba(255,160,70,' + Math.min(0.45, level * 0.047) + ')');
    c.fillStyle = gradient;
    c.fillRect(0, 0, cv.width, cv.height);
  }
  if (frames.size > 16) frames.delete(frames.keys().next().value);
  frames.set(k, cv);
  return cv;
}
