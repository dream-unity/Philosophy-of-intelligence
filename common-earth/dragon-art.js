/* Procedural isometric 2D art for the Dragon Stable, Enchanted Dragons,
   Wizards, and mid-flight dragonfire in Common Earth street view. */
(function (root) {
  'use strict';

  const TILT = 0.51;

  function proj(ox, oy, u, x, y, z = 0) {
    return [ox + (x - y) * u, oy + (x + y) * u * TILT - z * u];
  }

  function poly(g, pts, fill, stroke, lw = 1) {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }

  function isoBox(g, ox, oy, u, x, y, w, d, z, h, top, left, right) {
    const p = (ax, ay, az) => proj(ox, oy, u, ax, ay, az);
    poly(g, [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], left);
    poly(g, [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], right);
    poly(g, [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)], top);
  }

  /**
   * Draws the Dragon Stable building (vaulted enchanted stone stable, glowing
   * crystalline braziers, raised sky-perch platform, feeding trough, and aura).
   */
  function drawStable(g, ox, oy, u, night = false, time = 0, dragonCount = 1) {
    g.save();
    const p = (x, y, z = 0) => proj(ox, oy, u, x, y, z);
    const pulse = 0.72 + 0.28 * Math.sin(time * 2.6);

    // Enchanted stone courtyard plinth
    isoBox(g, ox, oy, u, -1.7, -1.5, 3.4, 3.0, 0, 0.14,
      night ? '#565978' : '#b7b2c7',
      night ? '#3d4059' : '#857f99',
      night ? '#2e3045' : '#6c6680');

    // Runic circle inlaid on courtyard floor
    const rc = p(0, 0.45, 0.16);
    g.save();
    g.strokeStyle = `rgba(148, 226, 255, ${0.42 + pulse * 0.35})`;
    g.lineWidth = Math.max(1, u * 0.055);
    g.beginPath();
    g.ellipse(rc[0], rc[1], u * 0.92, u * 0.46, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    // Main vaulted dragon sanctuary hall (rear half)
    isoBox(g, ox, oy, u, -1.45, -1.3, 2.9, 1.55, 0.14, 1.38,
      night ? '#464d72' : '#7b78a8',
      night ? '#363b5a' : '#968fb8',
      night ? '#292d47' : '#6f698f');

    // Swept enchanted peaked slate-amethyst roof with gold ridge
    const ridgeA = p(-1.55, -0.52, 2.22);
    const ridgeB = p(1.55, -0.52, 2.22);
    const eaveFL = p(-1.58, 0.32, 1.50);
    const eaveFR = p(1.58, 0.32, 1.50);
    const eaveBL = p(-1.58, -1.38, 1.50);
    const eaveBR = p(1.58, -1.38, 1.50);
    poly(g, [eaveBL, eaveBR, ridgeB, ridgeA], night ? '#273052' : '#4a4c78');
    poly(g, [eaveFL, eaveFR, ridgeB, ridgeA], night ? '#36416b' : '#5e5c94');
    poly(g, [eaveFR, eaveBR, ridgeB], night ? '#232b47' : '#44426b');
    // Glowing gold roof crest
    g.strokeStyle = '#f2c96d';
    g.lineWidth = Math.max(1.4, u * 0.085);
    g.beginPath(); g.moveTo(ridgeA[0], ridgeA[1]); g.lineTo(ridgeB[0], ridgeB[1]); g.stroke();

    // Wide arched dragon bay entrance (warm golden glow inside)
    const archPts = [p(-0.68, 0.26, 0.14), p(0.68, 0.26, 0.14), p(0.62, 0.26, 1.05), p(0, 0.26, 1.32), p(-0.62, 0.26, 1.05)];
    poly(g, archPts, night ? '#ffba5a' : '#472f42', '#e8c474', Math.max(1, u * 0.045));

    // Elevated Sky-Perch launch terrace on right wing
    isoBox(g, ox, oy, u, 0.72, 0.35, 0.85, 0.92, 0.14, 0.86,
      '#d9c69a', '#8c83a3', '#6b6380');
    // Feeding trough stocked with glowing golden grain on left wing
    isoBox(g, ox, oy, u, -1.42, 0.45, 0.88, 0.46, 0.14, 0.30,
      '#e8b954', '#7e5a3b', '#63452c');

    // Two crystalline arcane braziers flanking the entrance
    for (const bx of [-1.25, 1.25]) {
      isoBox(g, ox, oy, u, bx - 0.14, 1.12, 0.28, 0.28, 0.14, 0.52, '#a399ba', '#6e6885', '#544e69');
      const flame = p(bx, 1.26, 0.82);
      const gr = g.createRadialGradient(flame[0], flame[1], 0, flame[0], flame[1], u * 0.45);
      gr.addColorStop(0, `rgba(180, 245, 255, ${0.85 * pulse})`);
      gr.addColorStop(0.5, `rgba(128, 175, 255, ${0.42 * pulse})`);
      gr.addColorStop(1, 'rgba(128, 175, 255, 0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(flame[0], flame[1], u * 0.45, 0, Math.PI * 2); g.fill();
      poly(g, [
        [flame[0], flame[1] - u * 0.28],
        [flame[0] + u * 0.12, flame[1]],
        [flame[0], flame[1] + u * 0.14],
        [flame[0] - u * 0.12, flame[1]]
      ], '#c9f8ff');
    }

    // Miniature perched enchanted dragon on the sky perch if stable has dragons
    if (dragonCount > 0) {
      const perch = p(1.14, 0.80, 1.12);
      drawEnchantedDragon(g, perch[0], perch[1], u * 0.42, 0.4, time, {
        scale: '#56c2a8', accent: '#c9fff0', wing: '#2d7a78', aura: '#7efce0', fire: '#ff9638'
      }, false, false);
    }

    g.restore();
  }

  /**
   * Draws an enchanted magical dragon (optionally with a Wizard rider & fire breath!)
   * at screen coordinates (sx, sy) with scale `s` and heading angle `ang`.
   */
  function drawEnchantedDragon(g, sx, sy, s, ang = 0, time = 0, palette = {}, withWizard = true, breathingFire = false) {
    const scaleCol = palette.scale || '#4b9be0';
    const accentCol = palette.accent || '#a8f0ff';
    const wingCol = palette.wing || '#295d9c';
    const auraCol = palette.aura || '#7be6ff';
    const fireCol = palette.fire || '#ff882b';

    const flap = Math.sin(time * 7.2);
    const tailWave = Math.sin(time * 5.0) * s * 0.25;

    g.save();
    g.translate(sx, sy);

    // Shimmering magical aura glow
    const aura = g.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.55);
    aura.addColorStop(0, auraCol + '55');
    aura.addColorStop(0.6, auraCol + '1a');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = aura;
    g.beginPath(); g.arc(0, 0, s * 1.55, 0, Math.PI * 2); g.fill();

    g.rotate(ang);

    // Swept translucent enchanted wings (articulated beat)
    const wingSpan = s * (1.28 + flap * 0.22);
    const wingLift = -s * (0.35 + flap * 0.34);
    for (const side of [-1, 1]) {
      g.save();
      g.scale(1, side);
      poly(g, [
        [s * 0.12, s * 0.14],
        [-s * 0.22, wingSpan * 0.65],
        [-s * 0.85, wingSpan],
        [-s * 0.72, wingSpan * 0.45 + wingLift * 0.15],
        [-s * 0.35, s * 0.16]
      ], wingCol + 'dd', accentCol, Math.max(1, s * 0.06));
      // Luminous wing rune veins
      g.strokeStyle = accentCol;
      g.lineWidth = Math.max(0.8, s * 0.045);
      g.beginPath();
      g.moveTo(s * 0.05, s * 0.16);
      g.lineTo(-s * 0.58, wingSpan * 0.76);
      g.moveTo(-s * 0.08, s * 0.16);
      g.lineTo(-s * 0.68, wingSpan * 0.48);
      g.stroke();
      g.restore();
    }

    // Undulating dragon tail with crystal fin tip
    g.strokeStyle = scaleCol;
    g.lineWidth = Math.max(2, s * 0.24);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-s * 0.32, 0);
    g.quadraticCurveTo(-s * 0.82, tailWave, -s * 1.28, -tailWave * 0.8);
    g.stroke();
    poly(g, [
      [-s * 1.22, -tailWave * 0.8],
      [-s * 1.52, -tailWave * 0.8 - s * 0.18],
      [-s * 1.44, -tailWave * 0.8],
      [-s * 1.52, -tailWave * 0.8 + s * 0.18]
    ], accentCol);

    // Sculpted iridescent torso & neck
    g.fillStyle = scaleCol;
    g.beginPath();
    g.ellipse(0, 0, s * 0.56, s * 0.24, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = accentCol;
    g.lineWidth = Math.max(0.9, s * 0.05);
    g.stroke();

    // Neck & Horned Dragon Head
    poly(g, [
      [s * 0.38, -s * 0.12],
      [s * 0.96, -s * 0.15],
      [s * 1.18, 0],
      [s * 0.96, s * 0.15],
      [s * 0.38, s * 0.12]
    ], scaleCol, accentCol, Math.max(0.8, s * 0.045));
    // Horns
    g.strokeStyle = '#f8e6a8';
    g.lineWidth = Math.max(1, s * 0.06);
    g.beginPath();
    g.moveTo(s * 0.78, -s * 0.11); g.lineTo(s * 0.52, -s * 0.28);
    g.moveTo(s * 0.78, s * 0.11); g.lineTo(s * 0.52, s * 0.28);
    g.stroke();
    // Glowing eyes
    g.fillStyle = '#fff5a6';
    g.beginPath();
    g.arc(s * 0.94, -s * 0.06, Math.max(1.2, s * 0.055), 0, Math.PI * 2);
    g.arc(s * 0.94, s * 0.06, Math.max(1.2, s * 0.055), 0, Math.PI * 2);
    g.fill();

    // Wizard Rider seated on enchanted saddle
    if (withWizard) {
      g.fillStyle = '#39327a';
      g.beginPath(); g.arc(s * 0.12, 0, s * 0.19, 0, Math.PI * 2); g.fill();
      // Pointed wizard hat & glowing staff tip
      poly(g, [[s * 0.0, -s * 0.14], [s * 0.24, 0], [s * 0.0, s * 0.14]], '#5e4db2', '#f5d77f', Math.max(0.8, s * 0.04));
      g.fillStyle = '#a8f8ff';
      g.beginPath(); g.arc(s * 0.34, -s * 0.16, Math.max(1.5, s * 0.07), 0, Math.PI * 2); g.fill();
    }

    // Enchanted Dragonfire Cone
    if (breathingFire) {
      const len = s * (2.6 + 0.35 * Math.sin(time * 28));
      const grad = g.createLinearGradient(s * 1.15, 0, s * 1.15 + len, 0);
      grad.addColorStop(0, '#fff7cc');
      grad.addColorStop(0.28, fireCol);
      grad.addColorStop(0.72, '#ff3b1fcc');
      grad.addColorStop(1, 'rgba(255,60,20,0)');
      poly(g, [
        [s * 1.14, -s * 0.05],
        [s * 1.14 + len, -s * 0.62],
        [s * 1.14 + len * 1.08, 0],
        [s * 1.14 + len, s * 0.62],
        [s * 1.14, s * 0.05]
      ], grad);
    }

    // Floating magical sparkle motes
    for (let i = 0; i < 4; i++) {
      const a = time * 2.2 + i * 1.57;
      const mx = Math.cos(a) * s * 0.72 - s * 0.2;
      const my = Math.sin(a * 1.3) * s * 0.55;
      g.fillStyle = accentCol;
      g.beginPath(); g.arc(mx, my, Math.max(1, s * 0.045), 0, Math.PI * 2); g.fill();
    }

    g.restore();
  }

  root.EarthDragonArt = Object.freeze({ drawStable, drawEnchantedDragon });
})(typeof window === 'undefined' ? globalThis : window);
