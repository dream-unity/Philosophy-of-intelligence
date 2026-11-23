// Low-resolution alpha silhouettes sampled from the two live, uncured poses.
// Row zero is the top of the art; bit zero is its left edge before mirroring.
// This includes her outstretched fingers and the gathered hem, while a bottle
// crossing transparent space alongside her can carry on to the stone behind.
import { storyFigure } from './story-art.mjs';

const feeding = [
  0x00000020, 0x000601f8, 0x001f3ffa, 0x003ffffe, 0x007fffff, 0x007ffffe, 0x00ffffff, 0x00ffffff,
  0x01ffffff, 0x01fffffe, 0x01fffffc, 0x01fffbfe, 0x01ffffff, 0x01ffffe0, 0x01ffff00, 0x01ffff00,
  0x00ffff80, 0x01ffff80, 0x0fffffc0, 0x0fffffc0, 0x1fffffc0, 0x3fffffc0, 0x3fffffe0, 0x7ffffff0,
  0xfffffff0, 0xffffffc0, 0x3fffffc0, 0x0fffff80, 0x07ffff00, 0x03fff800, 0x007ff000, 0x000fc000,
];
const offering = [
  0x00024000, 0x0007fc00, 0x0007fc00, 0x001fff00, 0x000fff80, 0x00fffe00, 0x01ffff80, 0x01ffffc0,
  0x007fff90, 0x007ffff0, 0x01fffff8, 0x03fffff0, 0x07fffff0, 0x0ffffff0, 0x07fffff8, 0x07fffffc,
  0x07fffff8, 0x07fffffc, 0x0ffffffc, 0x0ffffffc, 0x0ffffffc, 0x1ffffff8, 0x3ffffff8, 0x7ffffffc,
  0x7ffffffc, 0x3ffffffe, 0x1ffffffc, 0x3ffffffc, 0xfffffffe, 0x7ffffffe, 0x3fff7ff8, 0x00001c00,
];

export function princessBottleTarget(w, time) {
  const figure = storyFigure(w, time);
  if (!figure || figure.key === 'cured') return null;
  const kneeling = figure.key === 'feeding';
  return {
    figure, mask: kneeling ? feeding : offering,
    width: figure.h * (kneeling ? 832 / 680 : 389 / 768),
    sin: Math.sin(w.player.yaw), cos: Math.cos(w.player.yaw),
  };
}
export function princessBottleEntry(target, from, to) {
  const { figure: f, mask, width, sin, cos } = target;
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const offsetX = from[0] - f.x, offsetZ = from[2] - f.z;
  const startDepth = offsetX * sin + offsetZ * cos, stepDepth = dx * sin + dz * cos;
  if (Math.min(startDepth, startDepth + stepDepth) > 0.12 ||
      Math.max(startDepth, startDepth + stepDepth) < -0.12) return Infinity;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.024));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (Math.abs(startDepth + stepDepth * t) > 0.12) continue;
    const side = (offsetX + dx * t) * cos - (offsetZ + dz * t) * sin;
    const col = Math.floor(32 * (0.5 + (f.flip ? -side : side) / width));
    const row = Math.floor(32 * (1 - (from[1] + dy * t - f.y) / f.h));
    if (row >= 0 && row < 32 && col >= 0 && col < 32 && ((mask[row] >>> col) & 1)) return t;
  }
  return Infinity;
}
