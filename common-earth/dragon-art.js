/* Procedural painterly isometric 2D art for the Giant Wolf Cave
   and Majestic Wolves (roaming, lunging/biting zombies, and howling at the Full Moon)
   in the Enchanted Forest of Common Earth. */
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

  function strokeLine(g, a, b, color, lw) {
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  }

  /**
   * Draws the Giant Wolf Cave — a monumental mossy granite cavern nestled in
   * the Enchanted Forest with gnarled ancient roots, hanging luminescent vines,
   * glowing spirit stones, ferns, fireflies, and an alpha wolf silhouette on the ledge.
   */
  function drawWolfCave(g, ox, oy, u, night = false, time = 0, wolfCount = 1) {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const p = (x, y, z = 0) => proj(ox, oy, u, x, y, z);
    const pulse = 0.72 + 0.28 * Math.sin(time * 2.4);

    // 1. Soft mossy forest ground & ambient cavern shadow
    const base = p(0, 0.25, 0);
    const shadGrad = g.createRadialGradient(base[0], base[1], u * 0.4, base[0], base[1], u * 2.95);
    shadGrad.addColorStop(0, night ? 'rgba(4, 12, 20, 0.72)' : 'rgba(18, 32, 22, 0.42)');
    shadGrad.addColorStop(0.65, night ? 'rgba(10, 24, 30, 0.34)' : 'rgba(34, 58, 38, 0.20)');
    shadGrad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shadGrad;
    g.beginPath();
    g.ellipse(base[0], base[1] + u * 0.14, u * 3.05, u * 1.65, 0, 0, Math.PI * 2);
    g.fill();

    // Mossy woodland clearing stone apron in front of cave entrance
    const clearPts = [
      p(-1.95, -1.25, 0.02), p(1.85, -1.35, 0.02),
      p(2.05, 1.35, 0.02), p(0.2, 1.85, 0.02), p(-1.85, 1.48, 0.02)
    ];
    poly(g, clearPts, night ? '#1c352d' : '#3d6343', night ? '#11221e' : '#2a4a31', Math.max(0.8, u * 0.028));

    // 2. Massive Sculpted Layered Granite Mountain Boulder (Giant Cave Shell)
    const rockDark = night ? '#27303d' : '#4a5256';
    const rockMid = night ? '#374252' : '#656e70';
    const rockLight = night ? '#4f5d70' : '#858f8c';
    const rockEdge = night ? '#141a24' : '#2c3336';

    // Rear cliff shoulder
    poly(g, [
      p(-2.05, -0.4, 0.04), p(-1.95, -1.45, 0.04),
      p(-1.35, -1.55, 1.75), p(-0.2, -1.4, 2.75),
      p(1.2, -1.35, 2.35), p(1.95, -0.65, 1.35),
      p(2.05, 0.35, 0.04)
    ], rockDark, rockEdge, Math.max(1.0, u * 0.036));

    // Main monolithic domed cave mound
    const domeTop = p(-0.15, -0.55, 2.78);
    const domeBot = p(0.0, 0.45, 0.05);
    const rockGrad = g.createLinearGradient(domeTop[0], domeTop[1], domeBot[0], domeBot[1]);
    rockGrad.addColorStop(0, rockLight);
    rockGrad.addColorStop(0.55, rockMid);
    rockGrad.addColorStop(1, rockDark);

    poly(g, [
      p(-1.92, 0.62, 0.05), p(-1.85, -0.45, 1.35),
      p(-1.25, -0.95, 2.28), p(-0.15, -0.82, 2.86),
      p(0.95, -0.78, 2.52), p(1.75, -0.15, 1.62),
      p(1.92, 0.72, 0.05), p(1.25, 0.95, 0.05),
      p(-1.25, 0.92, 0.05)
    ], rockGrad, rockEdge, Math.max(1.1, u * 0.04));

    // Sculpted rocky facets & crag shadow planes
    poly(g, [
      p(0.52, -0.78, 2.52), p(1.75, -0.15, 1.62),
      p(1.92, 0.72, 0.05), p(1.08, 0.78, 0.05), p(0.88, 0.15, 1.55)
    ], night ? 'rgba(18,24,36,0.45)' : 'rgba(42,48,54,0.34)');

    // Lush emerald-moss cap draping over the giant cave crown
    poly(g, [
      p(-1.55, -0.65, 1.82), p(-1.18, -0.98, 2.34),
      p(-0.12, -0.88, 2.90), p(0.92, -0.80, 2.54),
      p(1.42, -0.35, 1.98), p(0.75, -0.15, 2.02),
      p(-0.18, -0.05, 2.18), p(-0.98, -0.18, 1.88)
    ], night ? '#20493c' : '#3d7a47', night ? '#15342b' : '#2a5733', Math.max(0.8, u * 0.028));

    // 3. Deep Shadowed Giant Cavern Mouth with Warm Moonlit/Hearth Interior Depth
    const mouthOuter = [
      p(-1.12, 0.78, 0.05), p(-1.05, 0.56, 1.12),
      p(-0.62, 0.42, 1.72), p(0.02, 0.38, 1.88),
      p(0.66, 0.45, 1.68), p(1.08, 0.62, 1.05),
      p(1.12, 0.80, 0.05)
    ];
    poly(g, mouthOuter, night ? '#1b222e' : '#343b3e', rockEdge, Math.max(1.0, u * 0.036));

    const mouthInner = [
      p(-0.92, 0.82, 0.05), p(-0.84, 0.64, 1.02),
      p(-0.48, 0.52, 1.52), p(0.02, 0.48, 1.66),
      p(0.52, 0.54, 1.48), p(0.86, 0.66, 0.98),
      p(0.90, 0.82, 0.05)
    ];
    const mTop = p(0, 0.50, 1.66);
    const mBot = p(0, 0.82, 0.05);
    const caveGrad = g.createLinearGradient(mTop[0], mTop[1], mBot[0], mBot[1]);
    if (night) {
      caveGrad.addColorStop(0, '#070b14');
      caveGrad.addColorStop(0.55, '#132234');
      caveGrad.addColorStop(1, '#264458');
    } else {
      caveGrad.addColorStop(0, '#0d1316');
      caveGrad.addColorStop(0.62, '#1d2b2b');
      caveGrad.addColorStop(1, '#3b4a42');
    }
    poly(g, mouthInner, caveGrad);

    // Subtle glowing wolf-den eyes / spirit ember glimmer deep inside the cave mouth
    if (wolfCount > 0) {
      const eyeY = 0.56;
      for (const ex of [-0.26, -0.14]) {
        const ep = p(ex, 0.72, eyeY);
        g.fillStyle = night ? '#9cecff' : '#ffd86b';
        g.beginPath(); g.arc(ep[0], ep[1], Math.max(1.0, u * 0.042), 0, Math.PI * 2); g.fill();
      }
    }

    // 4. Gnarled Ancient Enchanted Tree Roots & Hanging Glowing Vines over the Cave Brow
    g.strokeStyle = night ? '#2c2520' : '#57412d';
    g.lineWidth = Math.max(1.8, u * 0.09);
    const rootA = [p(-0.85, -0.55, 2.38), p(-1.18, 0.15, 1.55), p(-1.32, 0.72, 0.62), p(-1.45, 1.15, 0.06)];
    g.beginPath();
    g.moveTo(rootA[0][0], rootA[0][1]);
    g.quadraticCurveTo(rootA[1][0], rootA[1][1], rootA[2][0], rootA[2][1]);
    g.lineTo(rootA[3][0], rootA[3][1]);
    g.stroke();

    const rootB = [p(0.82, -0.45, 2.24), p(1.22, 0.22, 1.38), p(1.36, 0.80, 0.52), p(1.52, 1.22, 0.06)];
    g.beginPath();
    g.moveTo(rootB[0][0], rootB[0][1]);
    g.quadraticCurveTo(rootB[1][0], rootB[1][1], rootB[2][0], rootB[2][1]);
    g.lineTo(rootB[3][0], rootB[3][1]);
    g.stroke();

    // Hanging glowing forest vines across the upper cave arch
    for (const vx of [-0.52, -0.18, 0.22, 0.55]) {
      const vTop = p(vx, 0.44, 1.72 - Math.abs(vx) * 0.35);
      const sway = Math.sin(time * 2.1 + vx * 4) * u * 0.05;
      const vEnd = [vTop[0] + sway, vTop[1] + u * (0.36 + (Math.abs(vx) * 0.22))];
      strokeLine(g, vTop, vEnd, night ? '#3a8c68' : '#4a8c4e', Math.max(1.0, u * 0.036));
      g.fillStyle = night ? `rgba(142, 255, 212, ${0.72 * pulse})` : '#8be690';
      g.beginPath(); g.arc(vEnd[0], vEnd[1], Math.max(1.1, u * 0.048), 0, Math.PI * 2); g.fill();
    }

    // 5. Flanking Carved Moonlit Forest Runestones & Glowing Mushrooms
    for (const sx of [-1.52, 1.48]) {
      const sb = p(sx, 1.05, 0.04);
      const st = p(sx, 1.05, 0.72);
      poly(g, [
        [sb[0] - u * 0.16, sb[1]], [sb[0] + u * 0.16, sb[1]],
        [st[0] + u * 0.09, st[1]], [st[0], st[1] - u * 0.14], [st[0] - u * 0.09, st[1]]
      ], night ? '#3c4b5c' : '#737d7a', rockEdge, Math.max(0.8, u * 0.03));

      const glow = g.createRadialGradient(st[0], st[1] + u * 0.12, 0, st[0], st[1] + u * 0.12, u * 0.48);
      glow.addColorStop(0, `rgba(148, 236, 255, ${(night ? 0.85 : 0.48) * pulse})`);
      glow.addColorStop(1, 'rgba(90, 210, 255, 0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(st[0], st[1] + u * 0.12, u * 0.48, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8f8ff';
      g.beginPath(); g.arc(st[0], st[1] + u * 0.12, Math.max(1.2, u * 0.055), 0, Math.PI * 2); g.fill();
    }

    // Bioluminescent turquoise/amber forest mushrooms & fireflies around the cave
    for (const [mx, my, col] of [[-1.68, 1.38, '#7af5d4'], [-1.12, 1.44, '#ffd978'], [1.18, 1.46, '#7af5d4'], [1.72, 1.32, '#9ee8ff']]) {
      const mp = p(mx, my, 0.04);
      g.fillStyle = col;
      g.beginPath(); g.ellipse(mp[0], mp[1] - u * 0.05, Math.max(1.8, u * 0.11), Math.max(1.1, u * 0.065), 0, Math.PI, 0); g.fill();
    }

    // 6. Proud Alpha Wolf Standing Watch atop the Giant Cave Ledge!
    if (wolfCount > 0) {
      const ledge = p(-0.12, -0.45, 2.74);
      drawMajesticWolf(g, ledge[0], ledge[1], u * 0.62, 0.12, time, {
        fur: '#dce6f2', accent: '#ffffff', mane: '#7c92ad', aura: '#9ee8ff', eye: '#ffe375'
      }, night, false, 0);
    }

    // Floating enchanted forest fireflies
    for (let i = 0; i < 6; i++) {
      const a = time * 1.4 + i * 1.1;
      const fp = p(Math.cos(a) * 1.75, 0.4 + Math.sin(a * 1.3) * 1.15, 0.8 + (i % 3) * 0.65 + Math.sin(time * 2.5 + i) * 0.18);
      g.fillStyle = i % 2 ? `rgba(182, 255, 220, ${0.75 * pulse})` : `rgba(255, 238, 146, ${0.8 * pulse})`;
      g.beginPath(); g.arc(fp[0], fp[1], Math.max(1.1, u * 0.045), 0, Math.PI * 2); g.fill();
    }

    g.restore();
  }

  /**
   * Draws a grounded, anatomically sculpted Majestic Wolf in isometric perspective:
   * - True paw-to-earth ground contact (y = 0): planted paws stay locked on the ground
   *   plane while hips/shoulders flex through a real 2-segment articulated canine gait!
   * - Muscular wolf silhouette (deep sloping chest, tucked waist, haunches, layered shoulder
   *   mane ruff, bushy feathered tail, alert pointed ears — ZERO floating oval).
   * - Subtle earthy dust kicks behind pushing paws when running across the land.
   * - Noble seated Full-Moon howling pose with acoustic rings when `howling = true`.
   */
  function drawMajesticWolf(g, sx, sy, s, ang = 0, time = 0, palette = {}, howling = false, biting = false, stridePhase = null, speedRatio = null) {
    const furCol = palette.fur || palette.scale || '#cfd8e2';
    const accentCol = palette.accent || '#f2f7ff';
    const maneCol = palette.mane || palette.wing || '#6e7e90';
    const darkFur = '#2a3440';
    const eyeCol = palette.eye || '#ffd452';

    const facingLeft = Math.cos(ang) < -0.05;
    const faceDir = facingLeft ? -1 : 1;
    const phase = stridePhase != null ? stridePhase : time * 8.0;
    const moveAmp = howling
      ? 0
      : (speedRatio != null ? Math.min(1.1, Math.max(0, speedRatio)) : 0.72);
    const breath = Math.sin(time * 2.8) * s * 0.014;

    // 2-segment articulated canine leg with strict y = 0 ground contact during stance phase
    function drawCanineLeg(hipX, hipY, legPhase, isFront, isNear, upperCol, lowerCol) {
      const cyc = Math.sin(legPhase);
      const fwd = Math.cos(legPhase);
      const strideReach = s * (isFront ? 0.30 : 0.32) * moveAmp;
      const liftH = s * (isFront ? 0.14 : 0.13) * moveAmp;
      // Foot stays LOCKED on the ground plane (y = 0) during stance (cyc <= 0), lifts only during forward swing!
      const pawX = hipX + (isFront ? s * 0.04 : -s * 0.05) + fwd * strideReach;
      const pawY = (cyc > 0 ? -cyc * liftH : 0) + (isNear ? s * 0.02 : -s * 0.02);

      // Ground contact micro-shadow directly beneath planted paws
      if (cyc <= 0.18) {
        g.fillStyle = 'rgba(10, 18, 14, 0.28)';
        g.beginPath();
        g.ellipse(pawX, isNear ? s * 0.02 : -s * 0.02, s * 0.10, s * 0.036, 0, 0, Math.PI * 2);
        g.fill();
      }

      // Compute anatomically bent middle joint (front elbow bends slightly back; hind hock bends back sharply)
      const midX = (hipX + pawX) * 0.5 + (isFront ? -s * 0.075 : -s * 0.125) * (0.75 + 0.35 * Math.max(0, cyc));
      const midY = (hipY + pawY) * 0.5 + (isFront ? s * 0.02 : -s * 0.02);

      // Muscular upper thigh / shoulder segment
      g.strokeStyle = upperCol;
      g.lineWidth = Math.max(2.0, s * (isFront ? 0.135 : 0.155));
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(hipX, hipY);
      g.lineTo(midX, midY);
      g.stroke();

      // Slender lower limb / cannon bone
      g.strokeStyle = lowerCol;
      g.lineWidth = Math.max(1.5, s * 0.095);
      g.beginPath();
      g.moveTo(midX, midY);
      g.lineTo(pawX, pawY - s * 0.02);
      g.stroke();

      // Distinct planted wolf paw touching the earth
      g.fillStyle = isNear ? accentCol : lowerCol;
      g.strokeStyle = darkFur;
      g.lineWidth = Math.max(0.6, s * 0.024);
      g.beginPath();
      g.ellipse(pawX + s * 0.035, pawY - s * 0.015, s * 0.075, s * 0.042, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }

    g.save();
    g.translate(sx, sy);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    // Tight, realistic ground-contact cast shadow directly beneath the wolf's paws at y = 0
    g.fillStyle = 'rgba(12, 22, 16, 0.34)';
    g.beginPath();
    g.ellipse(0, 0, s * (howling ? 0.54 : 0.72), s * (howling ? 0.19 : 0.21), 0, 0, Math.PI * 2);
    g.fill();

    g.save();
    g.scale(faceDir, 1);

    if (howling) {
      // ── NOBLE FULL-MOON HOWLING POSE (Firmly seated on ground at y = 0, muzzle skyward) ──
      // Subtle moonlit rim glow only when howling under the Full Moon
      const moonHalo = g.createRadialGradient(s * 0.1, -s * 0.6, s * 0.05, s * 0.1, -s * 0.6, s * 1.05);
      moonHalo.addColorStop(0, 'rgba(168, 226, 255, 0.28)');
      moonHalo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = moonHalo;
      g.beginPath(); g.arc(s * 0.1, -s * 0.6, s * 1.05, 0, Math.PI * 2); g.fill();

      // Swept bushy tail curled along the forest ground
      g.strokeStyle = maneCol;
      g.lineWidth = Math.max(2.2, s * 0.22);
      g.beginPath();
      g.moveTo(-s * 0.36, -s * 0.08);
      g.quadraticCurveTo(-s * 0.86, s * 0.02, -s * 1.06, -s * 0.22 + Math.sin(time * 2.2) * s * 0.03);
      g.stroke();
      g.strokeStyle = accentCol;
      g.lineWidth = Math.max(1.0, s * 0.08);
      g.beginPath();
      g.moveTo(-s * 0.64, -s * 0.04);
      g.quadraticCurveTo(-s * 0.90, -s * 0.10, -s * 1.06, -s * 0.22);
      g.stroke();

      // Grounded haunches & upright forelegs with paws planted at y = 0
      g.fillStyle = maneCol;
      g.beginPath(); g.ellipse(-s * 0.26, -s * 0.16, s * 0.27, s * 0.17, -0.25, 0, Math.PI * 2); g.fill();
      strokeLine(g, [s * 0.18, -s * 0.56], [s * 0.25, -s * 0.01], maneCol, Math.max(1.8, s * 0.13));
      strokeLine(g, [s * 0.06, -s * 0.52], [s * 0.13, 0.01], furCol, Math.max(2.0, s * 0.135));
      g.fillStyle = accentCol;
      g.beginPath(); g.ellipse(s * 0.16, 0.0, s * 0.08, s * 0.04, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(s * 0.28, -s * 0.02, s * 0.075, s * 0.038, 0, 0, Math.PI * 2); g.fill();

      // Sculpted seated chest & torso
      const bodyG = g.createLinearGradient(-s * 0.4, -s * 0.1, s * 0.3, -s * 0.85);
      bodyG.addColorStop(0, maneCol);
      bodyG.addColorStop(0.55, furCol);
      bodyG.addColorStop(1, accentCol);
      poly(g, [
        [-s * 0.42, -s * 0.06], [-s * 0.26, -s * 0.50],
        [s * 0.06, -s * 0.82], [s * 0.32, -s * 0.66],
        [s * 0.22, -s * 0.24], [-s * 0.18, -s * 0.01]
      ], bodyG, darkFur, Math.max(0.8, s * 0.034));

      // Layered neck ruff / mane
      poly(g, [
        [-s * 0.04, -s * 0.72], [s * 0.18, -s * 0.96],
        [s * 0.38, -s * 0.76], [s * 0.28, -s * 0.48], [s * 0.04, -s * 0.52]
      ], accentCol, maneCol, Math.max(0.75, s * 0.03));

      // Head tilted HIGH SKYWARD howling at the Full Moon
      g.save();
      g.translate(s * 0.21, -s * 0.92);
      g.rotate(-1.08 + Math.sin(time * 5.2) * 0.05);
      poly(g, [
        [-s * 0.17, -s * 0.13], [s * 0.10, -s * 0.17],
        [s * 0.46, -s * 0.08], [s * 0.44, 0.0],
        [s * 0.12, 0.04], [-s * 0.15, s * 0.13]
      ], furCol, darkFur, Math.max(0.8, s * 0.032));
      poly(g, [
        [s * 0.06, 0.02], [s * 0.40, s * 0.10],
        [s * 0.34, s * 0.17], [s * 0.02, s * 0.11]
      ], maneCol, darkFur, Math.max(0.7, s * 0.028));
      poly(g, [[-s * 0.13, -s * 0.11], [-s * 0.28, -s * 0.30], [-s * 0.02, -s * 0.17]], maneCol, accentCol, Math.max(0.7, s * 0.026));
      poly(g, [[-s * 0.04, -s * 0.13], [-s * 0.15, -s * 0.32], [s * 0.08, -s * 0.15]], furCol, accentCol, Math.max(0.7, s * 0.026));
      g.fillStyle = '#182028';
      g.beginPath(); g.arc(s * 0.45, -s * 0.04, Math.max(1.1, s * 0.042), 0, Math.PI * 2); g.fill();
      g.fillStyle = eyeCol;
      g.beginPath(); g.ellipse(s * 0.10, -s * 0.075, Math.max(1.2, s * 0.048), Math.max(0.8, s * 0.024), 0.1, 0, Math.PI * 2); g.fill();
      g.restore();

      // Silver-Moonlight Sonic Howl Rings rising from open maw
      const mouthX = s * 0.42;
      const mouthY = -s * 1.34;
      for (let w = 0; w < 3; w++) {
        const pWave = (time * 1.15 + w * 0.33) % 1;
        const r = s * (0.26 + pWave * 0.96);
        const alpha = (1 - pWave) * 0.72;
        g.strokeStyle = `rgba(176, 236, 255, ${alpha})`;
        g.lineWidth = Math.max(1.2, s * 0.05 * (1 - pWave * 0.4));
        g.beginPath();
        g.arc(mouthX + pWave * s * 0.22, mouthY - pWave * s * 0.62, r, -Math.PI * 0.85, -Math.PI * 0.15);
        g.stroke();
      }
    } else {
      // ── GROUNDED QUADRUPED STANDING / TROTTING / GALLOPING / LUNGING WOLF ──
      // Gentle spine pitch & shoulder/hip heave while paws stay planted at y = 0!
      const spineHeave = Math.sin(phase * 2) * s * 0.030 * moveAmp + breath;
      const spinePitch = Math.cos(phase) * 0.075 * moveAmp + (biting ? 0.14 : 0);
      const shoulderY = -s * 0.46 + spineHeave + Math.sin(spinePitch) * s * 0.28;
      const hipY = -s * 0.44 + spineHeave - Math.sin(spinePitch) * s * 0.28;

      // Subtle kicked-up forest dirt/grass dust wisps behind running hind paws right on the ground (y = 0)
      if (moveAmp > 0.28) {
        const dustCycle = (phase * 0.32) % 1;
        for (let d = 0; d < 2; d++) {
          const t = (dustCycle + d * 0.5) % 1;
          const dx = -s * (0.35 + t * 0.55);
          const dy = -s * (0.03 + t * 0.12);
          g.fillStyle = `rgba(128, 122, 98, ${(1 - t) * 0.36 * Math.min(1, moveAmp)})`;
          g.beginPath();
          g.arc(dx, dy, s * (0.045 + t * 0.075), 0, Math.PI * 2);
          g.fill();
        }
      }

      // 1. Far-side articulated legs (drawn BEHIND torso; diagonal quadruped trot/gallop phasing!)
      drawCanineLeg(-s * 0.36, hipY, phase + Math.PI, false, false, maneCol, '#53606e');
      drawCanineLeg(s * 0.26, shoulderY, phase + 0.35, true, false, maneCol, '#53606e');

      // 2. Bushy feathered wolf tail streaming from the sculpted rump
      const tailWave = Math.sin(phase * 0.9 + time * 2.2) * s * (0.05 + 0.05 * moveAmp);
      const rumpX = -s * 0.48;
      const rumpY = hipY - s * 0.05;
      g.strokeStyle = maneCol;
      g.lineWidth = Math.max(2.4, s * 0.21);
      g.beginPath();
      g.moveTo(rumpX, rumpY);
      g.quadraticCurveTo(rumpX - s * 0.38, rumpY + s * 0.04 + tailWave, rumpX - s * 0.64, rumpY + s * 0.16 + tailWave * 1.2);
      g.stroke();
      g.strokeStyle = accentCol;
      g.lineWidth = Math.max(1.0, s * 0.085);
      g.beginPath();
      g.moveTo(rumpX - s * 0.24, rumpY + s * 0.02 + tailWave * 0.5);
      g.quadraticCurveTo(rumpX - s * 0.46, rumpY + s * 0.09 + tailWave, rumpX - s * 0.64, rumpY + s * 0.16 + tailWave * 1.2);
      g.stroke();

      // 3. Sculpted muscular wolf torso (deep chest, lean tucked belly, powerful haunches — NO OVAL!)
      const torsoG = g.createLinearGradient(0, shoulderY - s * 0.28, 0, shoulderY + s * 0.22);
      torsoG.addColorStop(0, maneCol);
      torsoG.addColorStop(0.45, furCol);
      torsoG.addColorStop(1, accentCol);
      poly(g, [
        [-s * 0.50, hipY - s * 0.08],           // tail root
        [-s * 0.34, hipY - s * 0.21],           // upper croup/haunch
        [-s * 0.04, (hipY + shoulderY) * 0.5 - s * 0.19], // lean back ridge
        [s * 0.28, shoulderY - s * 0.24],       // proud withers/shoulders
        [s * 0.48, shoulderY - s * 0.10],       // deep muscular chest front
        [s * 0.36, shoulderY + s * 0.16],       // lower brisket
        [s * 0.06, (hipY + shoulderY) * 0.5 + s * 0.14],  // ribcage bottom
        [-s * 0.22, hipY + s * 0.07],           // tucked lean wolf flank/waist!
        [-s * 0.44, hipY + s * 0.13]            // rear thigh curve
      ], torsoG, darkFur, Math.max(0.85, s * 0.034));

      // Dark dorsal fur stripe along the wolf's back
      g.strokeStyle = maneCol;
      g.lineWidth = Math.max(1.4, s * 0.085);
      g.beginPath();
      g.moveTo(-s * 0.42, hipY - s * 0.14);
      g.quadraticCurveTo(-s * 0.04, (hipY + shoulderY) * 0.5 - s * 0.18, s * 0.26, shoulderY - s * 0.21);
      g.stroke();

      // 4. Thick layered wolf shoulder ruff & neck mane
      poly(g, [
        [s * 0.14, shoulderY - s * 0.26],
        [s * 0.46, shoulderY - s * 0.32],
        [s * 0.58, shoulderY - s * 0.06],
        [s * 0.42, shoulderY + s * 0.14],
        [s * 0.16, shoulderY + s * 0.04],
        [s * 0.24, shoulderY - s * 0.08]
      ], accentCol, maneCol, Math.max(0.75, s * 0.03));

      // 5. Near-side articulated legs (overlapping torso cleanly, paws solidly on y = 0!)
      drawCanineLeg(-s * 0.30, hipY + s * 0.02, phase, false, true, furCol, accentCol);
      drawCanineLeg(s * 0.32, shoulderY + s * 0.02, phase + Math.PI + 0.35, true, true, furCol, accentCol);

      // 6. Sculpted Wolf Head, Muzzle, Pointed Ears & Glowing Predator Eye
      const headX = s * 0.50;
      const headY = shoulderY - s * 0.22 + (biting ? s * 0.06 : 0);
      g.save();
      g.translate(headX, headY);
      g.rotate(biting ? 0.16 : spinePitch * 0.4);

      // Back ear
      poly(g, [[-s * 0.04, -s * 0.11], [-s * 0.10, -s * 0.37], [s * 0.08, -s * 0.15]], maneCol, darkFur, Math.max(0.7, s * 0.026));
      // Cranium & tapered canine snout
      poly(g, [
        [-s * 0.14, -s * 0.12], [s * 0.16, -s * 0.17],
        [s * 0.49, -s * 0.05], [s * 0.47, s * 0.04],
        [s * 0.15, s * 0.09], [-s * 0.12, s * 0.08]
      ], furCol, darkFur, Math.max(0.85, s * 0.034));
      // Pale cheek fur & muzzle underside
      poly(g, [
        [s * 0.06, -s * 0.02], [s * 0.45, s * 0.01],
        [s * 0.44, s * 0.05], [s * 0.12, s * 0.09], [-s * 0.06, s * 0.06]
      ], accentCol);
      // Front alert triangular wolf ear with pale inner tuft
      poly(g, [[s * 0.04, -s * 0.13], [s * 0.05, -s * 0.39], [s * 0.18, -s * 0.14]], furCol, darkFur, Math.max(0.7, s * 0.026));
      poly(g, [[s * 0.07, -s * 0.16], [s * 0.07, -s * 0.31], [s * 0.14, -s * 0.16]], accentCol);

      // Dark wet nose tip
      g.fillStyle = '#151b22';
      g.beginPath(); g.arc(s * 0.49, -s * 0.02, Math.max(1.2, s * 0.044), 0, Math.PI * 2); g.fill();

      // Piercing predator eye
      g.fillStyle = '#14191e';
      g.beginPath(); g.ellipse(s * 0.18, -s * 0.07, Math.max(1.5, s * 0.055), Math.max(1.0, s * 0.038), -0.12, 0, Math.PI * 2); g.fill();
      g.fillStyle = eyeCol;
      g.beginPath(); g.arc(s * 0.19, -s * 0.07, Math.max(1.1, s * 0.038), 0, Math.PI * 2); g.fill();

      // Fierce snapping jaw & slender razor slash when biting a zombie
      if (biting) {
        poly(g, [
          [s * 0.12, s * 0.05], [s * 0.44, s * 0.14],
          [s * 0.38, s * 0.21], [s * 0.08, s * 0.13]
        ], maneCol, darkFur, Math.max(0.7, s * 0.026));
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(s * 0.31, s * 0.04); g.lineTo(s * 0.35, s * 0.13); g.lineTo(s * 0.39, s * 0.04);
        g.fill();
        g.strokeStyle = 'rgba(224, 245, 255, 0.9)';
        g.lineWidth = Math.max(1.5, s * 0.065);
        g.beginPath();
        g.arc(s * 0.48, s * 0.04, s * 0.42, -0.85, 0.85);
        g.stroke();
      }
      g.restore();
    }

    g.restore(); // faceDir
    g.restore();
  }

  root.EarthDragonArt = Object.freeze({
    drawStable: drawWolfCave,
    drawWolfCave,
    drawEnchantedDragon: drawMajesticWolf,
    drawMajesticWolf
  });
})(typeof window === 'undefined' ? globalThis : window);
