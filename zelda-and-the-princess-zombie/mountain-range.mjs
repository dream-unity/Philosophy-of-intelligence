// A finite wraparound range, fixed to the valley rather than the camera. The two
// ends of the painted range meet at mirrored passes; the deepest saddle faces north.
const TAU = Math.PI * 2;
export const rangePanels = [];
for (let i = 0; i < 80; i++) {
  const point = (j, v) => {
    const a = (j * TAU) / 80,
      raw = j / 80 + 0.25,
      f = raw - Math.floor(raw);
    return [Math.sin(a) * 2290, v ? -112 : 775, 680 + Math.cos(a) * 2280, 1 - Math.abs(f * 2 - 1), v];
  };
  rangePanels.push([point(i, 1), point(i + 1, 1), point(i + 1, 0), point(i, 0)]);
}
export function mountainStrip() {
  const out = [];
  for (const face of rangePanels) for (const i of [0, 1, 2, 0, 2, 3]) out.push(...face[i], 1);
  return new Float32Array(out);
}
