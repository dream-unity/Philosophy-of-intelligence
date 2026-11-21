/* Procedural painterly isometric 2D art for the Dragon Sanctuary Citadel
   (Dragon Stable), Enchanted Dragons, Wizard riders, and luminous dragonfire
   in Common Earth street view and stable portraits. */
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

  function isoBox(g, ox, oy, u, x, y, w, d, z, h, top, left, right, stroke) {
    const p = (ax, ay, az) => proj(ox, oy, u, ax, ay, az);
    const lw = Math.max(0.65, u * 0.025);
    poly(g, [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], left, stroke, lw);
    poly(g, [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], right, stroke, lw);
    poly(g, [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)], top, stroke, lw);
  }

  function strokeLine(g, a, b, color, lw) {
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  }

  /**
   * Draws an ornate masonry wall face with subtle stone ashlar courses and mortar lines
   * so the Dragon Stable matches Common Earth's painted Stone Town architecture.
   */
  function drawStoneCourses(g, pFn, x0, y0, x1, y1, z0, z1, rows, cols, mortarColor, highlightColor, lw) {
    g.save();
    g.lineWidth = lw;
    for (let r = 1; r < rows; r++) {
      const z = z0 + (z1 - z0) * (r / rows);
      strokeLine(g, pFn(x0, y0, z), pFn(x1, y1, z), mortarColor, lw);
      strokeLine(g, pFn(x0, y0, z + 0.02), pFn(x1, y1, z + 0.02), highlightColor, lw * 0.65);
    }
    for (let r = 0; r < rows; r++) {
      const za = z0 + (z1 - z0) * (r / rows);
      const zb = z0 + (z1 - z0) * ((r + 1) / rows);
      const offset = (r % 2) * 0.5;
      for (let c = 1; c < cols; c++) {
        const t = (c + offset) / (cols + 0.5);
        if (t <= 0.04 || t >= 0.96) continue;
        const px = x0 + (x1 - x0) * t;
        const py = y0 + (y1 - y0) * t;
        strokeLine(g, pFn(px, py, za), pFn(px, py, zb), mortarColor, lw * 0.85);
      }
    }
    g.restore();
  }

  /**
   * Draws the Dragon Sanctuary Citadel (Dragon Stable) in rich painterly detail:
   * - Weathered limestone flagstone courtyard with carved steps & celestial brass/lapis rune circle
   * - Warm ashlar coral-limestone sanctuary hall with buttresses & carved timber eaves
   * - Oxidized verdigris-copper & royal-slate layered tiled roof with gilded bronze dragon finial
   * - Grand recessed stone archway glowing with warm hearth fire, iron lanterns & climbing vines
   * - Carved timber feed crib overflowing with golden grain
   * - Elevated crenellated stone sky-roost bastion with twin crystalline arcane braziers
   * - Finely rendered perched enchanted dragon when dragons are stabled
   */
  function drawStable(g, ox, oy, u, night = false, time = 0, dragonCount = 1) {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const p = (x, y, z = 0) => proj(ox, oy, u, x, y, z);
    const pulse = 0.72 + 0.28 * Math.sin(time * 2.7);
    const flicker = 0.85 + 0.15 * Math.sin(time * 9.4) * Math.cos(time * 5.3);

    // 1. Soft grounded ambient shadow beneath the entire sanctuary
    const shad = p(0.15, 0.2, 0);
    g.save();
    const sGrad = g.createRadialGradient(shad[0], shad[1], u * 0.3, shad[0], shad[1], u * 2.55);
    sGrad.addColorStop(0, night ? 'rgba(4, 10, 18, 0.62)' : 'rgba(22, 28, 24, 0.34)');
    sGrad.addColorStop(0.7, night ? 'rgba(4, 10, 18, 0.28)' : 'rgba(22, 28, 24, 0.14)');
    sGrad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sGrad;
    g.beginPath();
    g.ellipse(shad[0], shad[1] + u * 0.12, u * 2.75, u * 1.48, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // 2. Stepped Warm Limestone Flagstone Courtyard Plinth
    const stoneTop = night ? '#59616d' : '#d5c7ab';
    const stoneLeft = night ? '#3c434f' : '#a89677';
    const stoneRight = night ? '#2c313b' : '#857459';
    const stoneEdge = night ? 'rgba(18,24,34,0.45)' : 'rgba(72,56,38,0.28)';
    isoBox(g, ox, oy, u, -1.78, -1.55, 3.56, 3.12, 0, 0.16, stoneTop, stoneLeft, stoneRight, stoneEdge);

    // Flagstone paver grid lines on the courtyard floor
    g.save();
    g.strokeStyle = night ? 'rgba(26, 32, 44, 0.42)' : 'rgba(116, 98, 72, 0.32)';
    g.lineWidth = Math.max(0.6, u * 0.022);
    for (let gx = -1.2; gx <= 1.21; gx += 0.6) {
      strokeLine(g, p(gx, -1.5, 0.165), p(gx, 1.52, 0.165), g.strokeStyle, g.lineWidth);
    }
    for (let gy = -0.9; gy <= 1.21; gy += 0.55) {
      strokeLine(g, p(-1.72, gy, 0.165), p(1.72, gy, 0.165), g.strokeStyle, g.lineWidth);
    }
    g.restore();

    // Low carved courtyard curb parapet along front edge with warm entrance step
    isoBox(g, ox, oy, u, -1.78, 1.44, 1.05, 0.13, 0.16, 0.18,
      night ? '#687180' : '#dfd1b6', night ? '#484f5c' : '#b2a080', night ? '#353a45' : '#8e7d62');
    isoBox(g, ox, oy, u, 0.72, 1.44, 1.06, 0.13, 0.16, 0.18,
      night ? '#687180' : '#dfd1b6', night ? '#484f5c' : '#b2a080', night ? '#353a45' : '#8e7d62');

    // 3. Inlaid Celestial Brass & Lapis Dragon-Summoning Rune Circle on Courtyard
    const rc = p(-0.08, 0.78, 0.17);
    g.save();
    const runeGlow = g.createRadialGradient(rc[0], rc[1], u * 0.05, rc[0], rc[1], u * 0.92);
    runeGlow.addColorStop(0, `rgba(112, 224, 255, ${(night ? 0.36 : 0.22) * pulse})`);
    runeGlow.addColorStop(0.55, `rgba(232, 188, 98, ${(night ? 0.22 : 0.16) * pulse})`);
    runeGlow.addColorStop(1, 'rgba(92, 180, 240, 0)');
    g.fillStyle = runeGlow;
    g.beginPath();
    g.ellipse(rc[0], rc[1], u * 0.92, u * 0.46, 0, 0, Math.PI * 2);
    g.fill();

    // Outer gilded brass ring + inner lapis-cyan arcane ring
    g.strokeStyle = night ? 'rgba(242, 200, 108, 0.78)' : 'rgba(182, 134, 54, 0.78)';
    g.lineWidth = Math.max(1.1, u * 0.048);
    g.beginPath();
    g.ellipse(rc[0], rc[1], u * 0.78, u * 0.39, 0, 0, Math.PI * 2);
    g.stroke();

    g.strokeStyle = `rgba(130, 232, 255, ${0.46 + 0.38 * pulse})`;
    g.lineWidth = Math.max(0.9, u * 0.036);
    g.beginPath();
    g.ellipse(rc[0], rc[1], u * 0.56, u * 0.28, 0, 0, Math.PI * 2);
    g.stroke();

    // 8 compass rune ticks around the inlaid circle
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.18;
      const x1 = rc[0] + Math.cos(a) * u * 0.58;
      const y1 = rc[1] + Math.sin(a) * u * 0.29;
      const x2 = rc[0] + Math.cos(a) * u * 0.75;
      const y2 = rc[1] + Math.sin(a) * u * 0.375;
      strokeLine(g, [x1, y1], [x2, y2], `rgba(245, 212, 132, ${0.55 + 0.3 * pulse})`, Math.max(0.8, u * 0.028));
    }
    g.restore();

    // 4. Main Vaulted Sandstone & Coral-Masonry Dragon Sanctuary Hall
    const wallSun = night ? '#596378' : '#e2cda9';
    const wallShade = night ? '#3c4559' : '#bda57f';
    const wallTop = night ? '#485269' : '#d2be9a';
    isoBox(g, ox, oy, u, -1.52, -1.36, 3.04, 1.62, 0.16, 1.48, wallTop, wallSun, wallShade, stoneEdge);

    // Ashlar masonry courses on sunlit front wall & shaded right wall
    const mortar = night ? 'rgba(20, 26, 40, 0.38)' : 'rgba(110, 86, 56, 0.28)';
    const hiStone = night ? 'rgba(128, 150, 190, 0.16)' : 'rgba(255, 245, 222, 0.34)';
    drawStoneCourses(g, p, -1.52, 0.26, 1.52, 0.26, 0.16, 1.62, 6, 7, mortar, hiStone, Math.max(0.55, u * 0.02));
    drawStoneCourses(g, p, 1.52, -1.36, 1.52, 0.26, 0.16, 1.62, 6, 4, mortar, hiStone, Math.max(0.55, u * 0.02));

    // Corner limestone buttresses & decorative timber frieze beam under eaves
    for (const bx of [-1.56, -0.82, 0.76, 1.38]) {
      isoBox(g, ox, oy, u, bx, 0.18, 0.20, 0.18, 0.16, 1.44,
        night ? '#6d778f' : '#ebdab9', night ? '#515b70' : '#d1bc97', night ? '#384052' : '#a6906d', stoneEdge);
    }
    // Carved dark-cedar cornice timber band
    isoBox(g, ox, oy, u, -1.58, -1.40, 3.16, 1.72, 1.58, 0.12,
      night ? '#3d2f2c' : '#6c4932', night ? '#2d221f' : '#573926', night ? '#221817' : '#432b1c');

    // Arched gothic side-window on right wall (warm amber glass glow)
    const sideWin = [
      p(1.535, -0.78, 0.62), p(1.535, -0.32, 0.62),
      p(1.535, -0.32, 1.16), p(1.535, -0.55, 1.36), p(1.535, -0.78, 1.16)
    ];
    poly(g, sideWin, night ? '#ffbf63' : '#3a4b52', night ? '#806444' : '#6e563b', Math.max(1, u * 0.036));
    strokeLine(g, p(1.54, -0.55, 0.62), p(1.54, -0.55, 1.34), night ? '#5b432d' : '#8a7254', Math.max(0.7, u * 0.024));
    strokeLine(g, p(1.54, -0.78, 0.92), p(1.54, -0.32, 0.92), night ? '#5b432d' : '#8a7254', Math.max(0.7, u * 0.024));

    // 5. Grand Recessed Stone Dragon Bay Archway with Warm Hearth Fire Inside
    const outerArch = [
      p(-0.74, 0.27, 0.16), p(0.70, 0.27, 0.16),
      p(0.68, 0.27, 1.02), p(0.42, 0.27, 1.34), p(-0.02, 0.27, 1.46),
      p(-0.46, 0.27, 1.34), p(-0.72, 0.27, 1.02)
    ];
    poly(g, outerArch, night ? '#6e7788' : '#c6b08c', stoneEdge, Math.max(0.9, u * 0.035));

    const innerArch = [
      p(-0.58, 0.275, 0.16), p(0.54, 0.275, 0.16),
      p(0.52, 0.275, 0.96), p(0.30, 0.275, 1.22), p(-0.02, 0.275, 1.32),
      p(-0.34, 0.275, 1.22), p(-0.56, 0.275, 0.96)
    ];
    const archTopPt = p(-0.02, 0.275, 1.32);
    const archBotPt = p(-0.02, 0.275, 0.16);
    const hearthGrad = g.createLinearGradient(archTopPt[0], archTopPt[1], archBotPt[0], archBotPt[1]);
    if (night) {
      hearthGrad.addColorStop(0, '#3a221c');
      hearthGrad.addColorStop(0.45, '#b85a24');
      hearthGrad.addColorStop(1, '#ffd57a');
    } else {
      hearthGrad.addColorStop(0, '#2a2224');
      hearthGrad.addColorStop(0.58, '#523426');
      hearthGrad.addColorStop(1, '#c87e3c');
    }
    poly(g, innerArch, hearthGrad, '#d6ad5e', Math.max(0.8, u * 0.03));

    // Warm spilled firelight onto courtyard flagstones in front of arch
    const spill = p(-0.02, 0.56, 0.17);
    const spillGrad = g.createRadialGradient(spill[0], spill[1], 0, spill[0], spill[1], u * 0.72);
    spillGrad.addColorStop(0, `rgba(255, 192, 92, ${(night ? 0.45 : 0.22) * flicker})`);
    spillGrad.addColorStop(1, 'rgba(255, 145, 50, 0)');
    g.fillStyle = spillGrad;
    g.beginPath();
    g.ellipse(spill[0], spill[1], u * 0.72, u * 0.36, 0, 0, Math.PI * 2);
    g.fill();

    // Hanging wrought-iron lanterns flanking the archway
    for (const lx of [-0.66, 0.62]) {
      const hook = p(lx, 0.32, 1.12);
      const lamp = p(lx, 0.32, 0.96);
      strokeLine(g, hook, lamp, '#2b2420', Math.max(0.9, u * 0.032));
      const lg = g.createRadialGradient(lamp[0], lamp[1], 0, lamp[0], lamp[1], u * 0.28);
      lg.addColorStop(0, `rgba(255, 232, 145, ${(night ? 0.92 : 0.62) * flicker})`);
      lg.addColorStop(1, 'rgba(255, 165, 60, 0)');
      g.fillStyle = lg;
      g.beginPath(); g.arc(lamp[0], lamp[1], u * 0.28, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff0b3';
      g.beginPath(); g.arc(lamp[0], lamp[1], Math.max(1.2, u * 0.055), 0, Math.PI * 2); g.fill();
    }

    // 6. Swept Oxidized Verdigris-Copper & Slate Tiled Vaulted Roof (matches Stone Town's coastal roofs!)
    const ridgeA = p(-1.62, -0.55, 2.48);
    const ridgeB = p(1.62, -0.55, 2.48);
    const eaveFL = p(-1.68, 0.36, 1.66);
    const eaveFR = p(1.68, 0.36, 1.66);
    const eaveBL = p(-1.68, -1.46, 1.66);
    const eaveBR = p(1.68, -1.46, 1.66);

    // Roof back slope
    poly(g, [eaveBL, eaveBR, ridgeB, ridgeA], night ? '#1f3b44' : '#356c69');
    // Roof front sunlit slope with painted verdigris-and-terracotta patina gradient
    const roofGrad = g.createLinearGradient(ridgeA[0], ridgeA[1], eaveFL[0], eaveFL[1]);
    if (night) {
      roofGrad.addColorStop(0, '#294c57');
      roofGrad.addColorStop(0.55, '#345e68');
      roofGrad.addColorStop(1, '#23424c');
    } else {
      roofGrad.addColorStop(0, '#4f8f85');
      roofGrad.addColorStop(0.45, '#5fa195');
      roofGrad.addColorStop(0.8, '#8a7e5c');
      roofGrad.addColorStop(1, '#4c8077');
    }
    poly(g, [eaveFL, eaveFR, ridgeB, ridgeA], roofGrad, night ? '#182b33' : '#2d524c', Math.max(0.9, u * 0.032));
    // Roof right gable end (warm stone gable triangle under copper trim)
    poly(g, [eaveFR, eaveBR, ridgeB], night ? '#364154' : '#b29b77', night ? '#1e2838' : '#6c583c', Math.max(0.8, u * 0.03));

    // Layered roof shingle ribs & seams across the front roof slope
    g.save();
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const topPt = [ridgeA[0] + (ridgeB[0] - ridgeA[0]) * t, ridgeA[1] + (ridgeB[1] - ridgeA[1]) * t];
      const botPt = [eaveFL[0] + (eaveFR[0] - eaveFL[0]) * t, eaveFL[1] + (eaveFR[1] - eaveFL[1]) * t];
      strokeLine(g, topPt, botPt, night ? 'rgba(14,28,36,0.45)' : 'rgba(32,64,58,0.34)', Math.max(0.65, u * 0.024));
    }
    for (let r = 1; r <= 3; r++) {
      const t = r / 4;
      const lPt = [ridgeA[0] + (eaveFL[0] - ridgeA[0]) * t, ridgeA[1] + (eaveFL[1] - ridgeA[1]) * t];
      const rPt = [ridgeB[0] + (eaveFR[0] - ridgeB[0]) * t, ridgeB[1] + (eaveFR[1] - ridgeB[1]) * t];
      strokeLine(g, lPt, rPt, night ? 'rgba(138,212,218,0.16)' : 'rgba(220,245,232,0.24)', Math.max(0.6, u * 0.02));
    }
    g.restore();

    // Central gabled skylight dormer on roof catching arcane glow
    const dmL = p(-0.38, -0.02, 1.98), dmR = p(0.38, -0.02, 1.98), dmTop = p(0, -0.18, 2.34);
    poly(g, [dmL, dmR, dmTop], night ? '#485970' : '#d6c09a', night ? '#1e2c38' : '#57452e', Math.max(0.8, u * 0.026));
    const dmGlass = [p(-0.22, 0.0, 2.02), p(0.22, 0.0, 2.02), p(0, -0.10, 2.24)];
    poly(g, dmGlass, night ? '#8be8ff' : '#4a7f8a');

    // Gilded bronze roof ridge crest + ornate winged dragon weathervane finials
    strokeLine(g, ridgeA, ridgeB, night ? '#e8bd62' : '#f2c96d', Math.max(1.5, u * 0.075));
    for (const fx of [-1.52, 0, 1.52]) {
      const fBase = p(fx, -0.55, 2.48);
      const fTip = p(fx, -0.55, fx === 0 ? 2.86 : 2.74);
      strokeLine(g, fBase, fTip, '#f2c96d', Math.max(1.1, u * 0.045));
      g.fillStyle = fx === 0 ? '#a8f6ff' : '#f6d67c';
      g.beginPath();
      g.arc(fTip[0], fTip[1], Math.max(1.3, u * (fx === 0 ? 0.07 : 0.05)), 0, Math.PI * 2);
      g.fill();
    }

    // Climbing Mediterranean bougainvillea & emerald ivy along the left stone corner
    const vineCoords = [
      [-1.48, 0.29, 0.45], [-1.38, 0.29, 0.72], [-1.45, 0.29, 1.02],
      [-1.25, 0.29, 1.24], [-1.05, 0.29, 1.38], [-1.50, 0.29, 1.30]
    ];
    for (let i = 0; i < vineCoords.length; i++) {
      const vc = p(vineCoords[i][0], vineCoords[i][1], vineCoords[i][2]);
      g.fillStyle = night ? '#1f4d3a' : '#3a7a42';
      g.beginPath(); g.arc(vc[0], vc[1], Math.max(1.6, u * 0.11), 0, Math.PI * 2); g.fill();
      if (i % 2 === 0) {
        g.fillStyle = night ? '#9c3658' : '#d64775';
        g.beginPath(); g.arc(vc[0] + u * 0.04, vc[1] - u * 0.03, Math.max(1.2, u * 0.065), 0, Math.PI * 2); g.fill();
      }
    }

    // 7. Carved Timber Feed Crib brimming with Golden Grain (left courtyard)
    isoBox(g, ox, oy, u, -1.48, 0.56, 0.88, 0.46, 0.16, 0.34,
      night ? '#c2923c' : '#efc356', night ? '#573d28' : '#8a5f3b', night ? '#422d1d' : '#69472b', stoneEdge);
    // Grain mound highlight
    const gm = p(-1.04, 0.79, 0.54);
    g.fillStyle = night ? '#dfa94c' : '#ffe082';
    g.beginPath(); g.ellipse(gm[0], gm[1], u * 0.34, u * 0.14, 0, 0, Math.PI * 2); g.fill();

    // 8. Elevated Crenellated Limestone Sky-Roost Bastion Tower (right wing)
    isoBox(g, ox, oy, u, 0.74, 0.36, 0.92, 0.96, 0.16, 0.96,
      night ? '#697282' : '#dfd0b4', night ? '#4e586c' : '#c9b490', night ? '#384152' : '#9c8767', stoneEdge);
    drawStoneCourses(g, p, 0.74, 1.32, 1.66, 1.32, 0.16, 1.12, 4, 3, mortar, hiStone, Math.max(0.5, u * 0.018));
    // Battlement merlons around the perch rim
    for (const [mx, my] of [[0.76, 0.38], [1.14, 0.38], [1.46, 0.38], [1.46, 0.80], [1.46, 1.14], [0.76, 1.14]]) {
      isoBox(g, ox, oy, u, mx, my, 0.18, 0.18, 1.12, 0.16,
        night ? '#7a8396' : '#ebdec4', night ? '#596378' : '#cdb996', night ? '#424b5e' : '#a89270');
    }
    // Gilded landing medallion atop the sky-roost
    const perchCenter = p(1.20, 0.84, 1.14);
    g.strokeStyle = '#e8c166';
    g.lineWidth = Math.max(0.9, u * 0.036);
    g.beginPath(); g.ellipse(perchCenter[0], perchCenter[1], u * 0.34, u * 0.17, 0, 0, Math.PI * 2); g.stroke();

    // 9. Twin Carved Stone Pedestals & Luminous Crystal Arcane Braziers
    for (const bx of [-1.32, 1.24]) {
      isoBox(g, ox, oy, u, bx - 0.16, 1.14, 0.32, 0.32, 0.16, 0.54,
        night ? '#70798c' : '#dcd0b8', night ? '#515a6e' : '#b8a586', night ? '#3c4354' : '#928064', stoneEdge);
      // Brass brazier bowl
      isoBox(g, ox, oy, u, bx - 0.19, 1.11, 0.38, 0.38, 0.70, 0.10,
        '#d9ad54', '#a67d34', '#7d5c24');

      const flame = p(bx, 1.30, 0.96);
      // Outer warm-cyan magic halo
      const gr = g.createRadialGradient(flame[0], flame[1], 0, flame[0], flame[1], u * 0.56);
      gr.addColorStop(0, `rgba(220, 252, 255, ${0.9 * pulse})`);
      gr.addColorStop(0.35, `rgba(110, 214, 255, ${0.52 * pulse})`);
      gr.addColorStop(0.7, `rgba(255, 190, 96, ${0.22 * flicker})`);
      gr.addColorStop(1, 'rgba(90, 170, 255, 0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(flame[0], flame[1], u * 0.56, 0, Math.PI * 2); g.fill();

      // Faceted floating arcane crystal + animated flame tongue
      const bob = Math.sin(time * 3.1 + bx) * u * 0.05;
      poly(g, [
        [flame[0], flame[1] - u * 0.32 + bob],
        [flame[0] + u * 0.13, flame[1] - u * 0.02 + bob],
        [flame[0], flame[1] + u * 0.16 + bob],
        [flame[0] - u * 0.13, flame[1] - u * 0.02 + bob]
      ], '#a8f6ff', '#ffffff', Math.max(0.7, u * 0.024));
      poly(g, [
        [flame[0], flame[1] - u * 0.26 + bob],
        [flame[0] + u * 0.06, flame[1] - u * 0.02 + bob],
        [flame[0], flame[1] + u * 0.10 + bob]
      ], '#ffffffaa');
    }

    // 10. Perched Enchanted Dragon atop the Sky-Roost when dragons are stabled
    if (dragonCount > 0) {
      const perch = p(1.18, 0.82, 1.34);
      drawEnchantedDragon(g, perch[0], perch[1], u * 0.48, 0.42, time, {
        scale: '#e2a83c', accent: '#fff0b8', wing: '#a84e24', aura: '#ffcf66', fire: '#ff8a24'
      }, false, false);
    }

    g.restore();
  }

  /**
   * Draws a richly sculpted, luminous Enchanted Dragon (with optional Wizard rider
   * and multi-layered volumetric 2D dragonfire torrent) for Street View & Portraits.
   */
  function drawEnchantedDragon(g, sx, sy, s, ang = 0, time = 0, palette = {}, withWizard = true, breathingFire = false) {
    const scaleCol = palette.scale || '#4b9be0';
    const accentCol = palette.accent || '#a8f0ff';
    const wingCol = palette.wing || '#295d9c';
    const auraCol = palette.aura || '#7be6ff';
    const fireCol = palette.fire || '#ff882b';

    const flap = Math.sin(time * 6.8);
    const tailWave = Math.sin(time * 4.8) * s * 0.28;

    g.save();
    g.translate(sx, sy);

    // Subtle ground/sky depth shadow offset below when flying
    g.save();
    g.fillStyle = 'rgba(12, 22, 28, 0.18)';
    g.beginPath();
    g.ellipse(s * 0.18, s * 0.85, s * 0.95, s * 0.34, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // Soft shimmering enchanted aura halo
    const aura = g.createRadialGradient(0, 0, s * 0.08, 0, 0, s * 1.72);
    aura.addColorStop(0, auraCol + '4c');
    aura.addColorStop(0.55, auraCol + '1a');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = aura;
    g.beginPath(); g.arc(0, 0, s * 1.72, 0, Math.PI * 2); g.fill();

    g.rotate(ang);

    // 1. Multi-layered Volumetric Dragonfire Torrent (white-gold plasma core + billowing flame tongues + sparks)
    if (breathingFire) {
      const len = s * (3.1 + 0.42 * Math.sin(time * 26));
      const outerGrad = g.createLinearGradient(s * 1.18, 0, s * 1.18 + len, 0);
      outerGrad.addColorStop(0, '#fffbe0');
      outerGrad.addColorStop(0.22, '#ffcf54');
      outerGrad.addColorStop(0.55, fireCol + 'e6');
      outerGrad.addColorStop(0.84, '#d92814aa');
      outerGrad.addColorStop(1, 'rgba(180, 24, 12, 0)');
      g.fillStyle = outerGrad;
      g.beginPath();
      g.moveTo(s * 1.16, -s * 0.07);
      g.quadraticCurveTo(s * 1.16 + len * 0.48, -s * 0.45, s * 1.16 + len, -s * 0.78);
      g.quadraticCurveTo(s * 1.16 + len * 1.12, 0, s * 1.16 + len, s * 0.78);
      g.quadraticCurveTo(s * 1.16 + len * 0.48, s * 0.45, s * 1.16, s * 0.07);
      g.closePath();
      g.fill();

      // White-hot inner plasma core
      const coreGrad = g.createLinearGradient(s * 1.16, 0, s * 1.16 + len * 0.65, 0);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, '#fff0a6');
      coreGrad.addColorStop(1, 'rgba(255, 160, 40, 0)');
      g.fillStyle = coreGrad;
      g.beginPath();
      g.moveTo(s * 1.16, -s * 0.04);
      g.lineTo(s * 1.16 + len * 0.68, -s * 0.24);
      g.lineTo(s * 1.16 + len * 0.76, 0);
      g.lineTo(s * 1.16 + len * 0.68, s * 0.24);
      g.lineTo(s * 1.16, s * 0.04);
      g.closePath();
      g.fill();

      // Crackling embers flying out of the flame cone
      for (let e = 0; e < 7; e++) {
        const phase = (time * 5.2 + e * 0.37) % 1;
        const ex = s * 1.2 + phase * len * 1.15;
        const ey = Math.sin(e * 2.4 + time * 11) * s * 0.62 * phase;
        g.fillStyle = e % 2 ? '#fff4b8' : '#ff8c2b';
        g.beginPath(); g.arc(ex, ey, Math.max(1.1, s * 0.06 * (1 - phase * 0.5)), 0, Math.PI * 2); g.fill();
      }
    }

    // 2. Sweeping Arched Sculpted Wings with Scalloped Trailing Membrane & Glowing Arcane Veins
    const wingSpan = s * (1.42 + flap * 0.24);
    const wingSweep = s * (0.12 - flap * 0.16);
    for (const side of [-1, 1]) {
      g.save();
      g.scale(1, side);

      const wGrad = g.createLinearGradient(s * 0.1, s * 0.12, -s * 0.75, wingSpan);
      wGrad.addColorStop(0, scaleCol);
      wGrad.addColorStop(0.35, wingCol);
      wGrad.addColorStop(1, accentCol + 'cc');

      g.beginPath();
      g.moveTo(s * 0.22, s * 0.14);
      // Leading wing arm & elbow
      g.quadraticCurveTo(s * 0.28, wingSpan * 0.44, -s * 0.08 + wingSweep, wingSpan * 0.74);
      g.lineTo(-s * 0.92 + wingSweep, wingSpan * 1.05);
      // Scalloped bat-like draconic trailing bays between finger tips
      g.quadraticCurveTo(-s * 0.72, wingSpan * 0.72, -s * 0.96, wingSpan * 0.58);
      g.quadraticCurveTo(-s * 0.66, wingSpan * 0.44, -s * 0.78, wingSpan * 0.30);
      g.quadraticCurveTo(-s * 0.46, wingSpan * 0.24, -s * 0.44, s * 0.16);
      g.closePath();
      g.fillStyle = wGrad;
      g.fill();
      g.strokeStyle = accentCol;
      g.lineWidth = Math.max(0.9, s * 0.048);
      g.stroke();

      // Bone leading-edge spar & radiating finger struts
      g.strokeStyle = '#f5dfb0';
      g.lineWidth = Math.max(1.1, s * 0.062);
      g.beginPath();
      g.moveTo(s * 0.22, s * 0.15);
      g.lineTo(-s * 0.06 + wingSweep, wingSpan * 0.72);
      g.lineTo(-s * 0.90 + wingSweep, wingSpan * 1.03);
      g.stroke();

      g.strokeStyle = accentCol + 'cc';
      g.lineWidth = Math.max(0.75, s * 0.036);
      g.beginPath();
      g.moveTo(-s * 0.06 + wingSweep, wingSpan * 0.72);
      g.lineTo(-s * 0.94, wingSpan * 0.58);
      g.moveTo(-s * 0.06 + wingSweep, wingSpan * 0.72);
      g.lineTo(-s * 0.76, wingSpan * 0.30);
      g.moveTo(s * 0.08, s * 0.34);
      g.lineTo(-s * 0.52, wingSpan * 0.38);
      g.stroke();

      g.restore();
    }

    // 3. Tapered Sinuous Undulating Tail with Sculpted Spade Crystal Fin
    g.strokeStyle = scaleCol;
    g.lineWidth = Math.max(2.2, s * 0.25);
    g.beginPath();
    g.moveTo(-s * 0.36, 0);
    g.quadraticCurveTo(-s * 0.88, tailWave, -s * 1.38, -tailWave * 0.75);
    g.stroke();

    // Dorsal golden-crystal highlight ridge along tail
    g.strokeStyle = accentCol;
    g.lineWidth = Math.max(0.9, s * 0.06);
    g.beginPath();
    g.moveTo(-s * 0.36, 0);
    g.quadraticCurveTo(-s * 0.88, tailWave, -s * 1.38, -tailWave * 0.75);
    g.stroke();

    const tx = -s * 1.36, ty = -tailWave * 0.75;
    poly(g, [
      [tx + s * 0.1, ty],
      [tx - s * 0.26, ty - s * 0.22],
      [tx - s * 0.42, ty],
      [tx - s * 0.26, ty + s * 0.22]
    ], accentCol, scaleCol, Math.max(0.7, s * 0.035));

    // 4. Sculpted Muscular Torso with Metallic Gradient & Dorsal Crest Plates
    const bodyGrad = g.createLinearGradient(-s * 0.55, -s * 0.26, s * 0.55, s * 0.26);
    bodyGrad.addColorStop(0, wingCol);
    bodyGrad.addColorStop(0.45, scaleCol);
    bodyGrad.addColorStop(1, accentCol);
    g.fillStyle = bodyGrad;
    g.beginPath();
    g.ellipse(0, 0, s * 0.62, s * 0.25, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = accentCol;
    g.lineWidth = Math.max(0.85, s * 0.042);
    g.stroke();

    // Dorsal scale chevrons along spine
    for (let i = -2; i <= 2; i++) {
      const cx = i * s * 0.18;
      poly(g, [
        [cx + s * 0.08, 0],
        [cx - s * 0.05, -s * 0.09],
        [cx - s * 0.05, s * 0.09]
      ], accentCol + 'dd');
    }

    // 5. Arching Neck, Crowned Horned Draconic Head & Glowing Slit Eyes
    poly(g, [
      [s * 0.42, -s * 0.14],
      [s * 0.86, -s * 0.16],
      [s * 1.18, -s * 0.07],
      [s * 1.28, 0],
      [s * 1.18, s * 0.07],
      [s * 0.86, s * 0.16],
      [s * 0.42, s * 0.14]
    ], scaleCol, accentCol, Math.max(0.8, s * 0.04));

    // Swept ivory-gold crown horns
    g.strokeStyle = '#f8e6a8';
    g.lineWidth = Math.max(1.1, s * 0.065);
    g.beginPath();
    g.moveTo(s * 0.84, -s * 0.12);
    g.quadraticCurveTo(s * 0.66, -s * 0.28, s * 0.46, -s * 0.34);
    g.moveTo(s * 0.84, s * 0.12);
    g.quadraticCurveTo(s * 0.66, s * 0.28, s * 0.46, s * 0.34);
    g.stroke();

    // Luminous golden-amber eyes
    g.fillStyle = '#fff9c4';
    g.beginPath();
    g.arc(s * 0.98, -s * 0.07, Math.max(1.2, s * 0.055), 0, Math.PI * 2);
    g.arc(s * 0.98, s * 0.07, Math.max(1.2, s * 0.055), 0, Math.PI * 2);
    g.fill();

    // 6. Wizard Rider in Flowing Cloak, Star-Banded Pointed Hat & Glowing Staff
    if (withWizard) {
      // Flowing royal indigo cape fluttering behind saddle
      const capeWave = Math.sin(time * 9.5) * s * 0.08;
      poly(g, [
        [s * 0.08, -s * 0.12],
        [-s * 0.48, -s * 0.18 + capeWave],
        [-s * 0.56, capeWave * 0.5],
        [-s * 0.48, s * 0.18 + capeWave],
        [s * 0.08, s * 0.12]
      ], '#463794', '#f2cf78', Math.max(0.7, s * 0.032));

      // Wizard shoulders & pointed star-hat
      g.fillStyle = '#2d2566';
      g.beginPath(); g.arc(s * 0.16, 0, s * 0.18, 0, Math.PI * 2); g.fill();
      poly(g, [
        [s * 0.0, -s * 0.16],
        [s * 0.30, 0],
        [s * 0.0, s * 0.16]
      ], '#5a49b5', '#f5d77f', Math.max(0.8, s * 0.04));

      // Ornate staff & radiant arcane crystal orb
      strokeLine(g, [s * 0.18, -s * 0.12], [s * 0.44, -s * 0.24], '#e8c26d', Math.max(0.9, s * 0.04));
      const orbG = g.createRadialGradient(s * 0.44, -s * 0.24, 0, s * 0.44, -s * 0.24, s * 0.22);
      orbG.addColorStop(0, '#ffffff');
      orbG.addColorStop(0.45, '#96f6ff');
      orbG.addColorStop(1, 'rgba(120, 230, 255, 0)');
      g.fillStyle = orbG;
      g.beginPath(); g.arc(s * 0.44, -s * 0.24, s * 0.22, 0, Math.PI * 2); g.fill();
    }

    // 7. Orbiting celestial arcane motes
    for (let i = 0; i < 5; i++) {
      const a = time * 2.4 + i * 1.256;
      const mx = Math.cos(a) * s * 0.82 - s * 0.18;
      const my = Math.sin(a * 1.35) * s * 0.62;
      g.fillStyle = i % 2 ? '#fff4be' : accentCol;
      g.beginPath(); g.arc(mx, my, Math.max(1.0, s * 0.042), 0, Math.PI * 2); g.fill();
    }

    g.restore();
  }

  root.EarthDragonArt = Object.freeze({ drawStable, drawEnchantedDragon });
})(typeof window === 'undefined' ? globalThis : window);
