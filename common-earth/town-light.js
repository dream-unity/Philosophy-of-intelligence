/* Evening illumination is a view preference. The same streets, residents and clock
   remain playable under both lighting conditions. */
(() => {
  'use strict';
  let bloom, spill;

  function lightStamp(stops) {
    const image = document.createElement('canvas');
    image.width = image.height = 96;
    const pen = image.getContext('2d');
    if (!pen) return null;
    const brush = pen.createRadialGradient(48, 48, 0, 48, 48, 48);
    for (const [distance, color] of stops) brush.addColorStop(distance, color);
    pen.fillStyle = brush;
    pen.fillRect(0, 0, 96, 96);
    return image;
  }

  function lightsFor(decor, market) {
    const lights = decor.filter(prop => prop.type === 'lamp').map(prop => ({
      x: prop.x + .21, y: prop.y, z: 1.42, radius: 1.22
    }));
    // A pair of freestanding market lanterns at the edge of the public forecourt.
    for (const offset of [-1.5, 1.5]) {
      lights.push({x: market.x + offset, y: market.y + 1.74, z: .93, radius: 1.03, market: true});
    }
    return lights;
  }

  function stamp(ctx, image, x, y, w, h) {
    if (image) ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  }

  function paving(ctx, project, unit, lights) {
    spill ||= lightStamp([[0,'rgba(255,196,99,.71)'], [.38,'rgba(255,178,83,.35)'], [1,'rgba(251,165,83,0)']]);
    for (const light of lights) {
      const [x, y] = project(light.x, light.y, .014);
      const span = 2.5 * unit * light.radius;
      stamp(ctx, spill, x, y, span, span * .52);
    }
  }

  function lanternPost(ctx, project, unit, light) {
    const [x, foot] = project(light.x, light.y, 0);
    const [, top] = project(light.x, light.y, light.z);
    ctx.strokeStyle = '#45493c';
    ctx.lineWidth = Math.max(.9, unit * .05);
    ctx.beginPath(); ctx.moveTo(x, foot); ctx.lineTo(x, top); ctx.stroke();
    const r = Math.max(1, unit * .095);
    ctx.fillStyle = '#d8ba7e';
    ctx.fillRect(x - r * .55, top - r * 1.2, r * 1.1, r * 1.65);
    ctx.fillStyle = '#524a38';
    ctx.beginPath(); ctx.moveTo(x - r, top - r); ctx.lineTo(x, top - 1.75 * r); ctx.lineTo(x + r, top - r); ctx.fill();
  }

  function blueHour(ctx, width, height, depth=0) {
    // One translucent pass cools the whole diorama, including locally loaded art.
    ctx.fillStyle = 'rgba(16,28,62,'+(.43+.23*depth)+')';
    ctx.fillRect(0, 0, width, height);
  }

  function halo(ctx, project, unit, light) {
    bloom ||= lightStamp([[0,'rgba(255,249,216,1)'], [.09,'rgba(255,225,150,.98)'], [.22,'rgba(255,193,112,.49)'], [1,'rgba(240,164,82,0)']]);
    const [x, y] = project(light.x, light.y, light.z);
    const span = Math.max(9, unit * light.radius * 1.03);
    stamp(ctx, bloom, x, y, span, span);
  }

  window.EarthTownLight = Object.freeze({lightsFor, paving, lanternPost, blueHour, halo});
})();
