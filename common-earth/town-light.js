/* Enchanted Forest Evening & Full Moon Illumination:
   Every night features a radiant Full Moon high in the sky with silver lunar craters,
   starlight, and soft moonbeams filtering across the Enchanted Forest while the wolves howl. */
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
    for (const offset of [-1.5, 1.5]) {
      lights.push({ x: market.x + offset, y: market.y + 1.74, z: .93, radius: 1.03, market: true });
    }
    return lights;
  }

  function stamp(ctx, image, x, y, w, h) {
    if (image) ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  }

  function paving(ctx, project, unit, lights) {
    spill ||= lightStamp([[0, 'rgba(255,196,99,.71)'], [.38, 'rgba(255,178,83,.35)'], [1, 'rgba(251,165,83,0)']]);
    for (const light of lights) {
      const [x, y] = project(light.x, light.y, .014);
      const span = 2.5 * unit * light.radius;
      stamp(ctx, spill, x, y, span, span * .52);
    }
  }

  function lanternPost(ctx, project, unit, light) {
    const [x, foot] = project(light.x, light.y, 0);
    const [, top] = project(light.x, light.y, light.z);
    ctx.strokeStyle = '#3b4a3d';
    ctx.lineWidth = Math.max(.9, unit * .05);
    ctx.beginPath(); ctx.moveTo(x, foot); ctx.lineTo(x, top); ctx.stroke();
    const r = Math.max(1, unit * .095);
    ctx.fillStyle = '#c8f5d6';
    ctx.fillRect(x - r * .55, top - r * 1.2, r * 1.1, r * 1.65);
    ctx.fillStyle = '#3c4a3a';
    ctx.beginPath(); ctx.moveTo(x - r, top - r); ctx.lineTo(x, top - 1.75 * r); ctx.lineTo(x + r, top - r); ctx.fill();
  }

  /**
   * Renders the Enchanted Forest Night Wash + Radiant Full Moon every single night!
   */
  function blueHour(ctx, width, height, depth = 0, time = 0) {
    ctx.save();
    // 1. Deep moonlit midnight-indigo enchanted forest wash
    const nightAlpha = 0.42 + 0.20 * Math.max(0, Math.min(1, depth));
    const skyWash = ctx.createLinearGradient(0, 0, 0, height);
    skyWash.addColorStop(0, `rgba(7, 16, 42, ${Math.min(0.76, nightAlpha + 0.14)})`);
    skyWash.addColorStop(0.45, `rgba(12, 24, 54, ${nightAlpha})`);
    skyWash.addColorStop(1, `rgba(10, 26, 44, ${Math.max(0.32, nightAlpha - 0.06)})`);
    ctx.fillStyle = skyWash;
    ctx.fillRect(0, 0, width, height);

    // 2. Twinkling starfield across the upper night sky
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 197 + 43) % 94 + 3) * 0.01 * width;
      const sy = ((i * 89 + 19) % 24 + 3) * 0.01 * height;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * (1.2 + (i % 4) * 0.35) + i * 1.7));
      ctx.fillStyle = `rgba(224, 242, 255, ${tw * 0.72})`;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 1.6 : 1.05), 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Radiant Full Moon EVERY night in the upper-right sky!
    const moonR = Math.max(24, Math.min(44, Math.min(width, height) * 0.056));
    const mx = Math.max(moonR + 40, width - Math.max(108, width * 0.11));
    const my = Math.max(moonR + 48, Math.min(108, height * 0.16));

    // Wide silvery moonlit atmospheric halo
    const haloGrad = ctx.createRadialGradient(mx, my, moonR * 0.5, mx, my, moonR * 4.8);
    haloGrad.addColorStop(0, 'rgba(232, 246, 255, 0.42)');
    haloGrad.addColorStop(0.28, 'rgba(164, 212, 255, 0.22)');
    haloGrad.addColorStop(0.65, 'rgba(98, 152, 224, 0.08)');
    haloGrad.addColorStop(1, 'rgba(40, 82, 160, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonR * 4.8, 0, Math.PI * 2);
    ctx.fill();

    // Diagonal silvery moonbeams streaming down into the Enchanted Forest
    ctx.save();
    const beamGrad = ctx.createLinearGradient(mx, my, mx - width * 0.35, height * 0.82);
    beamGrad.addColorStop(0, 'rgba(198, 232, 255, 0.11)');
    beamGrad.addColorStop(1, 'rgba(140, 198, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(mx - moonR * 0.7, my + moonR * 0.3);
    ctx.lineTo(mx + moonR * 0.5, my + moonR * 0.7);
    ctx.lineTo(mx - width * 0.12, height * 0.85);
    ctx.lineTo(mx - width * 0.48, height * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Full Moon luminous disc
    const discGrad = ctx.createRadialGradient(mx - moonR * 0.22, my - moonR * 0.22, moonR * 0.1, mx, my, moonR);
    discGrad.addColorStop(0, '#ffffff');
    discGrad.addColorStop(0.62, '#eef6ff');
    discGrad.addColorStop(0.92, '#cfe2f6');
    discGrad.addColorStop(1, '#b6d2ee');
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Realistic subtle lunar maria & craters on the Full Moon face
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.clip();
    const craters = [
      [-0.28, -0.22, 0.24], [0.22, -0.14, 0.28], [0.05, 0.24, 0.22],
      [-0.36, 0.18, 0.16], [0.34, 0.26, 0.14], [-0.08, -0.36, 0.13]
    ];
    for (const [cx, cy, cr] of craters) {
      ctx.fillStyle = 'rgba(146, 170, 202, 0.24)';
      ctx.beginPath();
      ctx.arc(mx + cx * moonR, my + cy * moonR, cr * moonR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  function halo(ctx, project, unit, light) {
    bloom ||= lightStamp([[0, 'rgba(220,255,236,1)'], [.12, 'rgba(150,240,210,.88)'], [.30, 'rgba(110,210,196,.42)'], [1, 'rgba(70,164,172,0)']]);
    const [x, y] = project(light.x, light.y, light.z);
    const span = Math.max(9, unit * light.radius * 1.03);
    stamp(ctx, bloom, x, y, span, span);
  }

  window.EarthTownLight = Object.freeze({ lightsFor, paving, lanternPost, blueHour, halo });
})();
