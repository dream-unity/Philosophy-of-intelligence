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
   * Draws a richly sculpted Majestic Wolf in isometric perspective:
   * - Running/striding muscular quadruped anatomy with thick fur mane ruff & bushy tail
   * - Fierce fang-lunge & silver slash arc when biting zombies (`biting = true`)
   * - Noble seated/reared Full-Moon Howling silhouette with head tilted high skyward
   *   and visible silver-cyan acoustic howl rings rising toward the Full Moon (`howling = true`)
   */
  function drawMajesticWolf(g, sx, sy, s, ang = 0, time = 0, palette = {}, howling = false, biting = false, stridePhase = null) {
    const furCol = palette.fur || palette.scale || '#cfd8e2';
    const accentCol = palette.accent || '#f2f7ff';
    const maneCol = palette.mane || palette.wing || '#7c8b9c';
    const auraCol = palette.aura || '#b8dcff';
    const eyeCol = palette.eye || '#ffd452';

    const facingLeft = Math.cos(ang) < -0.05;
    const faceDir = facingLeft ? -1 : 1;
    const phase = stridePhase != null ? stridePhase : time * 9.5;
    const stride = howling ? 0 : Math.sin(phase);
    const bounce = howling ? 0 : Math.abs(stride) * s * 0.08;

    g.save();
    g.translate(sx, sy);

    // Grounded soft shadow beneath paws
    g.fillStyle = 'rgba(10, 20, 18, 0.34)';
    g.beginPath();
    g.ellipse(0, s * 0.10, s * 0.82, s * 0.30, 0, 0, Math.PI * 2);
    g.fill();

    // Subtle moonlit enchanted forest fur aura
    const aura = g.createRadialGradient(0, -s * 0.45, s * 0.08, 0, -s * 0.45, s * 1.25);
    aura.addColorStop(0, auraCol + (howling ? '55' : '2a'));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = aura;
    g.beginPath(); g.arc(0, -s * 0.45, s * 1.25, 0, Math.PI * 2); g.fill();

    g.save();
    g.scale(faceDir, 1);

    if (howling) {
      // ── NOBLE FULL-MOON HOWLING POSE (Seated on haunches, muzzle tilted high to the sky!) ──
      // Swept bushy tail resting behind haunches
      g.strokeStyle = maneCol;
      g.lineWidth = Math.max(2.2, s * 0.24);
      g.beginPath();
      g.moveTo(-s * 0.38, -s * 0.12);
      g.quadraticCurveTo(-s * 0.92, -s * 0.02, -s * 1.12, -s * 0.28 + Math.sin(time * 2.4) * s * 0.04);
      g.stroke();
      g.strokeStyle = accentCol;
      g.lineWidth = Math.max(1.0, s * 0.09);
      g.beginPath();
      g.moveTo(-s * 0.65, -s * 0.08);
      g.quadraticCurveTo(-s * 0.96, -s * 0.14, -s * 1.12, -s * 0.28);
      g.stroke();

      // Seated hind leg & upright forelegs
      g.fillStyle = maneCol;
      g.beginPath(); g.ellipse(-s * 0.28, -s * 0.18, s * 0.28, s * 0.20, -0.3, 0, Math.PI * 2); g.fill();
      strokeLine(g, [s * 0.16, -s * 0.56], [s * 0.26, 0.02], maneCol, Math.max(2.0, s * 0.15));
      strokeLine(g, [s * 0.04, -s * 0.52], [s * 0.12, 0.04], furCol, Math.max(2.0, s * 0.15));

      // Proud angled chest & torso
      const bodyG = g.createLinearGradient(-s * 0.4, -s * 0.1, s * 0.3, -s * 0.85);
      bodyG.addColorStop(0, maneCol);
      bodyG.addColorStop(0.55, furCol);
      bodyG.addColorStop(1, accentCol);
      poly(g, [
        [-s * 0.44, -s * 0.10], [-s * 0.28, -s * 0.52],
        [s * 0.06, -s * 0.82], [s * 0.34, -s * 0.66],
        [s * 0.24, -s * 0.24], [-s * 0.18, -s * 0.02]
      ], bodyG, '#24303c', Math.max(0.8, s * 0.036));

      // Thick noble neck ruff / mane
      poly(g, [
        [-s * 0.04, -s * 0.72], [s * 0.18, -s * 0.98],
        [s * 0.40, -s * 0.78], [s * 0.30, -s * 0.48], [s * 0.04, -s * 0.52]
      ], accentCol, maneCol, Math.max(0.75, s * 0.032));

      // Head tilted HIGH SKYWARD howling at the Full Moon (-65°)
      g.save();
      g.translate(s * 0.22, -s * 0.94);
      g.rotate(-1.08 + Math.sin(time * 5.2) * 0.05);
      // Cranium + elongated upper muzzle + open howling lower jaw
      poly(g, [
        [-s * 0.18, -s * 0.14], [s * 0.10, -s * 0.18],
        [s * 0.48, -s * 0.08], [s * 0.46, 0.0],
        [s * 0.12, 0.04], [-s * 0.16, s * 0.14]
      ], furCol, '#24303c', Math.max(0.8, s * 0.034));
      // Open howling lower jaw
      poly(g, [
        [s * 0.06, 0.02], [s * 0.42, s * 0.10],
        [s * 0.36, s * 0.18], [s * 0.02, s * 0.12]
      ], maneCol, '#24303c', Math.max(0.7, s * 0.03));
      // Pointed wolf ears swept back
      poly(g, [[-s * 0.14, -s * 0.12], [-s * 0.30, -s * 0.32], [-s * 0.02, -s * 0.18]], maneCol, accentCol, Math.max(0.7, s * 0.028));
      poly(g, [[-s * 0.04, -s * 0.14], [-s * 0.16, -s * 0.34], [s * 0.08, -s * 0.16]], furCol, accentCol, Math.max(0.7, s * 0.028));
      // Closed/squinted soulful howling eye + dark nose tip
      g.fillStyle = '#182028';
      g.beginPath(); g.arc(s * 0.47, -s * 0.04, Math.max(1.1, s * 0.045), 0, Math.PI * 2); g.fill();
      g.fillStyle = eyeCol;
      g.beginPath(); g.ellipse(s * 0.10, -s * 0.08, Math.max(1.2, s * 0.05), Math.max(0.8, s * 0.025), 0.1, 0, Math.PI * 2); g.fill();
      g.restore();

      // Visible Silver-Moonlight Sonic Howl Waves rising skyward from open maw!
      const mouthX = s * 0.44;
      const mouthY = -s * 1.38;
      for (let w = 0; w < 3; w++) {
        const pWave = (time * 1.15 + w * 0.33) % 1;
        const r = s * (0.28 + pWave * 1.05);
        const alpha = (1 - pWave) * 0.72;
        g.strokeStyle = `rgba(176, 236, 255, ${alpha})`;
        g.lineWidth = Math.max(1.2, s * 0.055 * (1 - pWave * 0.4));
        g.beginPath();
        g.arc(mouthX + pWave * s * 0.25, mouthY - pWave * s * 0.65, r, -Math.PI * 0.85, -Math.PI * 0.15);
        g.stroke();
      }
    } else {
      // ── MAJESTIC STRIDING / SPRINTING / LUNGING WOLF POSE ──
      const lungeLean = biting ? 0.18 : 0;
      g.translate(0, -bounce);
      g.rotate(lungeLean);

      // Bushy feathered tail streaming behind
      const tailWag = Math.sin(time * 5.6) * s * 0.10;
      g.strokeStyle = maneCol;
      g.lineWidth = Math.max(2.4, s * 0.22);
      g.beginPath();
      g.moveTo(-s * 0.52, -s * 0.56);
      g.quadraticCurveTo(-s * 0.92, -s * 0.62 + tailWag, -s * 1.18, -s * 0.40 + tailWag * 1.2);
      g.stroke();
      g.strokeStyle = accentCol;
      g.lineWidth = Math.max(1.0, s * 0.085);
      g.beginPath();
      g.moveTo(-s * 0.78, -s * 0.56 + tailWag * 0.6);
      g.quadraticCurveTo(-s * 1.02, -s * 0.50 + tailWag, -s * 1.18, -s * 0.40 + tailWag * 1.2);
      g.stroke();

      // Far-side striding legs
      const legStride = stride * s * 0.28;
      strokeLine(g, [-s * 0.38, -s * 0.40], [-s * 0.44 - legStride, s * 0.02], maneCol, Math.max(1.8, s * 0.13));
      strokeLine(g, [s * 0.30, -s * 0.42], [s * 0.34 + legStride, s * 0.02], maneCol, Math.max(1.8, s * 0.13));

      // Muscular wolf torso with layered coat gradient
      const torsoG = g.createLinearGradient(-s * 0.6, -s * 0.75, s * 0.6, -s * 0.25);
      torsoG.addColorStop(0, maneCol);
      torsoG.addColorStop(0.5, furCol);
      torsoG.addColorStop(1, accentCol);
      g.fillStyle = torsoG;
      g.beginPath();
      g.ellipse(0, -s * 0.52, s * 0.58, s * 0.24, -0.06, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#24303c';
      g.lineWidth = Math.max(0.8, s * 0.035);
      g.stroke();

      // Near-side striding legs
      strokeLine(g, [-s * 0.32, -s * 0.38], [-s * 0.36 + legStride, s * 0.04], furCol, Math.max(2.0, s * 0.14));
      strokeLine(g, [s * 0.34, -s * 0.40], [s * 0.40 - legStride, s * 0.04], furCol, Math.max(2.0, s * 0.14));

      // Thick shoulder mane / fur ruff
      poly(g, [
        [s * 0.18, -s * 0.76], [s * 0.54, -s * 0.84],
        [s * 0.68, -s * 0.56], [s * 0.46, -s * 0.32], [s * 0.16, -s * 0.40]
      ], accentCol, maneCol, Math.max(0.8, s * 0.032));

      // Noble sculpted wolf head, pointed ears & snarling jaws
      poly(g, [
        [s * 0.44, -s * 0.82], [s * 0.76, -s * 0.86],
        [s * 1.06, -s * 0.72], [s * 1.04, -s * 0.62],
        [s * 0.72, -s * 0.56], [s * 0.46, -s * 0.60]
      ], furCol, '#24303c', Math.max(0.8, s * 0.036));

      // Pointed triangular ears
      poly(g, [[s * 0.48, -s * 0.80], [s * 0.44, -s * 1.08], [s * 0.62, -s * 0.84]], maneCol, accentCol, Math.max(0.7, s * 0.028));
      poly(g, [[s * 0.60, -s * 0.82], [s * 0.62, -s * 1.10], [s * 0.74, -s * 0.84]], furCol, accentCol, Math.max(0.7, s * 0.028));

      // Nose & glowing predator eyes
      g.fillStyle = '#182028';
      g.beginPath(); g.arc(s * 1.05, -s * 0.69, Math.max(1.2, s * 0.048), 0, Math.PI * 2); g.fill();
      g.fillStyle = eyeCol;
      g.shadowColor = eyeCol;
      g.shadowBlur = Math.max(3, s * 0.18);
      g.beginPath(); g.arc(s * 0.76, -s * 0.75, Math.max(1.2, s * 0.052), 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;

      // Fierce snapping jaws + silver claw/fang slash arc when biting a zombie!
      if (biting) {
        poly(g, [
          [s * 0.72, -s * 0.60], [s * 1.02, -s * 0.50],
          [s * 0.96, -s * 0.44], [s * 0.68, -s * 0.52]
        ], maneCol, '#24303c', Math.max(0.7, s * 0.028));
        // Razor white fangs
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(s * 0.88, -s * 0.63); g.lineTo(s * 0.92, -s * 0.53); g.lineTo(s * 0.96, -s * 0.63);
        g.fill();
        // Silver crescent fang/claw slash arc in front of jaws
        g.strokeStyle = 'rgba(235, 248, 255, 0.92)';
        g.lineWidth = Math.max(1.8, s * 0.09);
        g.beginPath();
        g.arc(s * 1.05, -s * 0.62, s * 0.52, -0.95, 0.95);
        g.stroke();
        g.strokeStyle = 'rgba(130, 224, 255, 0.65)';
        g.lineWidth = Math.max(1.1, s * 0.05);
        g.beginPath();
        g.arc(s * 1.15, -s * 0.62, s * 0.68, -0.75, 0.75);
        g.stroke();
      }
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
