// 2D Canvas Trauma Ward simulation & renderer.
// Renders 10 patient bays in two compact clinical rows (5 Upper Resuscitation bays +
// 5 Lower Intake bays) with live scrolling ECG waveforms, dynamic BPM & trauma tags,
// right-click ruled-out markers, live cross-highlight glow, expanding shockwaves,
// and floating +SAVED! / CRASH! callouts.

import { PATIENTS } from './roster.js';

const BAY_ACCENTS = Object.freeze([
  '#2dd4bf', // surgical teal
  '#38bdf8', // pulse sky
  '#a78bfa', // neuro violet
  '#34d399', // oxygen emerald
  '#fbbf24', // triage amber
]);

const BASE_PACE_SECONDS = Object.freeze([42, 46, 50, 54, 58, 62, 66, 70, 74, 78]);

export class TraumaWardScene {
  constructor(canvas, { onSelectPatient, onTimeout, onLayout } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelectPatient = onSelectPatient || (() => {});
    this.onTimeout = onTimeout || (() => {});
    this.onLayout = onLayout || (() => {});

    this.width = 960;
    this.height = 174;
    this.dpr = 1;

    this.mode = 'title'; // 'title' | 'playing' | 'debrief' | 'paused' | 'nback'
    this.paceMultiplier = 1.0;
    this.highlightedPatientId = null;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 10 patient bay entities
    this.bays = PATIENTS.map((p, i) => ({
      index: i,
      patient: p,
      row: i < 5 ? 0 : 1,
      col: i % 5,
      x: 0,
      y: 0,
      w: 160,
      h: 66,
      progress: 0,
      durationSec: BASE_PACE_SECONDS[i],
      accent: BAY_ACCENTS[i % BAY_ACCENTS.length],
      ecgPhase: i * 1.17,
      state: 'active', // 'active' | 'saved' | 'missed' | 'target-missed' | 'rival' | 'dim'
      isTarget: false,
      flashTimer: 0,
      flashColor: '#2dd4bf',
      hovered: false,
      ruledOut: false,
      inShortlist: true,
    }));

    // Zero-GC particle ring buffer
    this.particles = Array.from({ length: 56 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.45,
      color: '#2dd4bf',
      size: 2.5,
    }));
    this.particleCursor = 0;

    // Expanding stabilization/alert shockwave rings
    this.rings = [];
    // Floating feedback callouts (+SAVED!, ✕ MISS)
    this.popups = [];

    this.elapsedTime = 0;
    this.rafId = null;
    this.lastTs = 0;
    this.renderAccum = 0;
    this.gridCanvas = null;
    this.shakeTrauma = 0;
    this.hitstop = 0;
    this.timeoutFired = false;

    this._bindEvents();
    this.resize();
  }

  _bindEvents() {
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.canvas.parentElement || this.canvas);
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._ro) this._ro.disconnect();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const nextW = Math.round(rect.width);
    const nextH = Math.round(rect.height);
    if (nextW === this.width && nextH === this.height && nextDpr === this.dpr && this.gridCanvas) {
      return;
    }
    this.dpr = nextDpr;
    this.width = nextW;
    this.height = nextH;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this._layoutBays();
    this._buildGridCache();
    this.onLayout(this.bays, this.width, this.height);
    this.render();
  }

  _buildGridCache() {
    if (typeof document === 'undefined') return;
    const g = document.createElement('canvas');
    g.width = this.width;
    g.height = this.height;
    const gctx = g.getContext('2d');
    gctx.fillStyle = '#0c131d';
    gctx.fillRect(0, 0, this.width, this.height);
    gctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    gctx.lineWidth = 1;
    const step = 24;
    gctx.beginPath();
    for (let x = step; x < this.width; x += step) {
      gctx.moveTo(x + 0.5, 0);
      gctx.lineTo(x + 0.5, this.height);
    }
    for (let y = step; y < this.height; y += step) {
      gctx.moveTo(0, y + 0.5);
      gctx.lineTo(this.width, y + 0.5);
    }
    gctx.stroke();
    this.gridCanvas = g;
  }

  _layoutBays() {
    const compact = this.width < 600;
    const padX = compact ? 6 : Math.max(10, Math.round(this.width * 0.012));
    const padTop = 18;
    const padBottom = 6;
    const gapX = compact ? 5 : Math.max(8, Math.round(this.width * 0.01));
    const gapY = 17;

    const cols = 5;
    const rows = 2;
    const availW = this.width - padX * 2 - gapX * (cols - 1);
    const availH = this.height - padTop - padBottom - gapY * (rows - 1);
    const cardW = Math.max(52, Math.floor(availW / cols));
    const cardH = Math.max(54, Math.floor(availH / rows));

    const totalW = cardW * cols + gapX * (cols - 1);
    const startX = Math.max(padX, Math.floor((this.width - totalW) / 2));

    for (const bay of this.bays) {
      bay.w = cardW;
      bay.h = cardH;
      bay.x = startX + bay.col * (cardW + gapX);
      bay.y = padTop + bay.row * (cardH + gapY);
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  setPaceMultiplier(mult) {
    this.paceMultiplier = Math.max(0.25, Math.min(3.0, mult));
  }

  setHighlightedPatient(patientId) {
    if (this.highlightedPatientId === patientId) return;
    this.highlightedPatientId = patientId || null;
    for (const bay of this.bays) {
      bay.hovered = bay.patient.id === this.highlightedPatientId;
    }
    this.render();
  }

  setRuledOut(patientId, ruledOut) {
    const bay = this.bays.find((b) => b.patient.id === patientId);
    if (!bay) return;
    bay.ruledOut = !!ruledOut;
    this.render();
  }

  loadTrial(trial, { useShortlist = false } = {}) {
    const targetSet = new Set(trial.targets);
    const shortlistSet = useShortlist ? new Set(trial.shortlist) : null;
    this.timeoutFired = false;
    this.highlightedPatientId = null;
    this.rings.length = 0;
    this.popups.length = 0;

    const paces = BASE_PACE_SECONDS.slice();
    for (let i = paces.length - 1; i > 0; i--) {
      const j = (i * 7 + trial.tierRank * 3 + Math.floor(this.elapsedTime * 10)) % (i + 1);
      [paces[i], paces[j]] = [paces[j], paces[i]];
    }

    const tierFactor = 1 - (trial.tierRank - 1) * 0.045;

    this.bays.forEach((bay, i) => {
      bay.isTarget = targetSet.has(bay.patient.id);
      bay.inShortlist = !shortlistSet || shortlistSet.has(bay.patient.id);
      bay.state = 'active';
      bay.progress = 0.04 + (i % 3) * 0.025;
      bay.durationSec = Math.max(24, paces[i] * tierFactor);
      bay.flashTimer = 0;
      bay.hovered = false;
      bay.ruledOut = false;
    });
    this.render();
  }

  markPatientResult(patientId, isCorrect) {
    const bay = this.bays.find((b) => b.patient.id === patientId);
    if (!bay) return;
    bay.ruledOut = false;
    bay.state = isCorrect ? 'saved' : 'missed';
    bay.flashTimer = 0.34;
    bay.flashColor = isCorrect ? '#2dd4bf' : '#ef4444';

    const cx = bay.x + bay.w * 0.5;
    const cy = bay.y + bay.h * 0.5;
    if (!isCorrect) {
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.52);
      this.hitstop = 0.04;
    }

    if (!this.reducedMotion) {
      this.rings.push({
        x: cx,
        y: cy,
        r: 10,
        maxR: Math.max(bay.w * 0.58, 56),
        life: 0,
        maxLife: 0.42,
        color: isCorrect ? '#2dd4bf' : '#ef4444',
      });
      this.popups.push({
        x: cx,
        y: cy - 4,
        vy: -36,
        life: 0,
        maxLife: 0.72,
        text: isCorrect ? '+SAVED!' : '✕ WRONG',
        color: isCorrect ? '#5eead4' : '#fca5a5',
      });
    }

    this._spawnParticles(cx, cy, isCorrect ? '#2dd4bf' : '#f59e0b', isCorrect ? 16 : 10);
  }

  revealDebrief(targets, rivalId) {
    this.highlightedPatientId = null;
    const targetSet = new Set(targets);
    for (const bay of this.bays) {
      bay.ruledOut = false;
      bay.hovered = false;
      if (bay.state === 'saved' || bay.state === 'missed') continue;
      if (targetSet.has(bay.patient.id)) {
        bay.state = 'target-missed';
      } else if (bay.patient.id === rivalId) {
        bay.state = 'rival';
      } else {
        bay.state = 'dim';
      }
    }
    this.render();
  }

  _spawnParticles(x, y, color, count) {
    if (this.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const speed = 42 + Math.random() * 88;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 0.34 + Math.random() * 0.2;
      p.color = color;
      p.size = 2 + Math.random() * 2.2;
    }
  }

  startLoop() {
    if (this.rafId) return;
    this.lastTs = performance.now();
    const tick = (ts) => {
      const rawDt = Math.max(0, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      const dt = Math.min(rawDt, 0.05);
      this.step(dt);
      this.renderAccum += dt;
      if (this.mode !== 'paused' && this.renderAccum >= 0.033) {
        this.renderAccum = 0;
        this.render();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  step(dt) {
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.5);
    }
    for (const bay of this.bays) {
      if (bay.flashTimer > 0) bay.flashTimer = Math.max(0, bay.flashTimer - dt);
    }
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life += dt;
      if (ring.life >= ring.maxLife) {
        this.rings.splice(i, 1);
      } else {
        ring.r = 10 + (ring.maxR - 10) * (1 - Math.pow(1 - ring.life / ring.maxLife, 2));
      }
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life += dt;
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
      if (pop.life >= pop.maxLife) this.popups.splice(i, 1);
    }

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }
    if (this.mode === 'paused') return;

    this.elapsedTime += dt;

    for (const bay of this.bays) {
      const rate =
        this.mode === 'playing' && bay.state === 'active'
          ? 1.85 + bay.progress * 2.9
          : 1.25;
      bay.ecgPhase += dt * rate;

      if (this.mode === 'playing' && bay.state === 'active') {
        bay.progress += (dt * this.paceMultiplier) / bay.durationSec;
        if (bay.progress >= 1 && bay.isTarget && !this.timeoutFired) {
          bay.progress = 1;
          this.timeoutFired = true;
          this.onTimeout(bay.patient.id);
        } else if (bay.progress >= 1 && !bay.isTarget) {
          bay.progress = 0.96;
        }
      } else if (this.mode === 'title') {
        bay.progress = 0.25 + 0.12 * Math.sin(this.elapsedTime * 0.6 + bay.index * 0.9);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    if (this.shakeTrauma > 0 && !this.reducedMotion) {
      const mag = this.shakeTrauma * this.shakeTrauma * 4.5;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    if (this.gridCanvas) {
      ctx.drawImage(this.gridCanvas, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#0c131d';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Crisp row headers inside the compact margins
    ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
    ctx.font = '700 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const firstUpper = this.bays[0];
    const firstLower = this.bays[5];
    if (firstUpper) {
      ctx.fillText('RESUSCITATION BAYS 01–05', firstUpper.x, Math.max(9, firstUpper.y - 9));
    }
    if (firstLower) {
      ctx.fillText('INTAKE & TRIAGE BAYS 06–10', firstLower.x, firstLower.y - 8);
    }

    // Right-aligned subtle scratchpad legend in top margin on wide screens
    if (this.mode === 'playing' && this.width >= 680 && firstUpper) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.textAlign = 'right';
      const rightEdge = this.bays[4].x + this.bays[4].w;
      ctx.fillText('CLICK / KEYS 1–0: TREAT  ·  RIGHT-CLICK: RULE OUT', rightEdge, Math.max(9, firstUpper.y - 9));
    }

    for (const bay of this.bays) {
      this._drawBay(ctx, bay);
    }

    // Shockwave rings
    for (const ring of this.rings) {
      const alpha = Math.max(0, 1 - ring.life / ring.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating callout text
    for (const pop of this.popups) {
      const alpha = Math.max(0, 1 - pop.life / pop.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#071018';
      ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawBay(ctx, bay) {
    const { x, y, w, h, progress, state, hovered, inShortlist, ruledOut } = bay;
    const isDimmed = state === 'dim' || (this.mode === 'playing' && (!inShortlist || ruledOut));

    let borderColor = 'rgba(148, 163, 184, 0.24)';
    let bgFill = '#131d2b';
    let waveColor = bay.accent;
    const liveBpm = Math.round((bay.patient.baseBpm || 84) + progress * 46);
    let statusLabel = `${liveBpm} BPM`;
    let statusColor = '#94a3b8';

    if (state === 'saved') {
      borderColor = '#2dd4bf';
      bgFill = '#0f292b';
      waveColor = '#2dd4bf';
      statusLabel = '✓ SAVED';
      statusColor = '#5eead4';
    } else if (state === 'target-missed') {
      borderColor = '#38bdf8';
      bgFill = '#102438';
      waveColor = '#38bdf8';
      statusLabel = '◎ TARGET';
      statusColor = '#7dd3fc';
    } else if (state === 'missed') {
      borderColor = '#ef4444';
      bgFill = '#2a1519';
      waveColor = '#f87171';
      statusLabel = '✕ WRONG';
      statusColor = '#fca5a5';
    } else if (state === 'rival') {
      borderColor = '#f59e0b';
      bgFill = '#261e12';
      waveColor = '#fbbf24';
      statusLabel = '△ RIVAL';
      statusColor = '#fcd34d';
    } else if (ruledOut && this.mode === 'playing') {
      borderColor = 'rgba(148, 163, 184, 0.18)';
      bgFill = '#0e1621';
      waveColor = '#64748b';
      statusLabel = '✕ OUT';
      statusColor = '#64748b';
    } else if (this.mode === 'playing' && progress >= 0.78) {
      borderColor = '#ef4444';
      bgFill = '#20141b';
      waveColor = '#f87171';
      statusLabel = `▲ ${liveBpm}`;
      statusColor = '#fca5a5';
    } else if (this.mode === 'playing' && progress >= 0.5) {
      borderColor = '#f59e0b';
      bgFill = '#1c1d22';
      waveColor = '#fbbf24';
      statusLabel = `◆ ${liveBpm}`;
      statusColor = '#fcd34d';
    }

    if (hovered) {
      borderColor = '#5eead4';
      bgFill = '#162b3b';
    }

    ctx.save();
    if (isDimmed && !hovered) ctx.globalAlpha = ruledOut ? 0.42 : 0.34;

    this._roundRect(ctx, x, y, w, h, 7);
    ctx.fillStyle = bgFill;
    ctx.fill();
    ctx.lineWidth = hovered || state === 'saved' || state === 'missed' || state === 'target-missed' ? 2 : 1;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    if (bay.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, bay.flashTimer * 1.4);
      this._roundRect(ctx, x, y, w, h, 7);
      ctx.fillStyle = bay.flashColor;
      ctx.fill();
      ctx.restore();
    }

    const keyNum = bay.index === 9 ? '0' : String(bay.index + 1);
    const isNarrow = w < 118;
    const pad = isNarrow ? 5 : 8;
    const headerY = y + 13;

    if (isNarrow) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${keyNum} ${bay.patient.name}`, x + pad, headerY);
    } else {
      ctx.fillStyle = hovered ? 'rgba(45, 212, 191, 0.25)' : 'rgba(148, 163, 184, 0.14)';
      this._roundRect(ctx, x + pad, y + 5, 18, 16, 4);
      ctx.fill();
      ctx.fillStyle = hovered ? '#5eead4' : '#cbd5e1';
      ctx.font = '700 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(keyNum, x + pad + 9, headerY);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(bay.patient.name, x + pad + 23, headerY);

      if (w >= 175 && bay.patient.traumaTag) {
        const nameW = ctx.measureText(bay.patient.name).width;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(bay.patient.traumaTag, x + pad + 27 + nameW, headerY + 0.5);
      }

      if (w >= 132) {
        ctx.fillStyle = statusColor;
        ctx.font = '700 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(statusLabel, x + w - pad, headerY);
      }
    }

    // Live procedural ECG waveform strip
    const waveX = x + pad;
    const waveW = w - pad * 2;
    const waveY = y + Math.round(h * 0.56);
    const waveAmp = Math.max(7, Math.min(13, h * 0.17));

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(waveX, waveY);
    ctx.lineTo(waveX + waveW, waveY);
    ctx.stroke();

    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const samples = Math.max(16, Math.floor(waveW / 6));
    for (let s = 0; s <= samples; s++) {
      const u = s / samples;
      const px = waveX + u * waveW;
      const cycle = (u * 2.2 + bay.ecgPhase * 0.45) % 1;
      let py = waveY;
      if (state === 'missed') {
        py = waveY + Math.sin(u * 20 + bay.ecgPhase) * 1.1;
      } else {
        if (cycle > 0.18 && cycle < 0.24) {
          py = waveY - Math.sin(((cycle - 0.18) / 0.06) * Math.PI) * waveAmp * 0.22;
        } else if (cycle >= 0.30 && cycle < 0.33) {
          py = waveY + waveAmp * 0.28;
        } else if (cycle >= 0.33 && cycle < 0.38) {
          py = waveY - waveAmp * 1.0;
        } else if (cycle >= 0.38 && cycle < 0.42) {
          py = waveY + waveAmp * 0.42;
        } else if (cycle >= 0.54 && cycle < 0.66) {
          py = waveY - Math.sin(((cycle - 0.54) / 0.12) * Math.PI) * waveAmp * 0.32;
        }
      }
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Diagonal strike line when ruled out by player
    if (ruledOut && this.mode === 'playing' && state === 'active') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + h - 6);
      ctx.lineTo(x + w - 6, y + 6);
      ctx.stroke();
    }

    // Bottom critical-window progress bar
    const barX = x + pad;
    const barY = y + h - 10;
    const barW = w - pad * 2;
    const barH = 4.5;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    this._roundRect(ctx, barX, barY, barW, barH, 2.5);
    ctx.fill();

    const clamped = Math.max(0, Math.min(1, progress));
    const fillW = Math.max(3, Math.round(barW * clamped));
    ctx.fillStyle =
      state === 'saved'
        ? '#2dd4bf'
        : state === 'missed' || clamped >= 0.78
          ? '#ef4444'
          : clamped >= 0.5
            ? '#f59e0b'
            : '#38bdf8';
    this._roundRect(ctx, barX, barY, fillW, barH, 2.5);
    ctx.fill();

    // 80% critical threshold tick
    ctx.fillStyle = 'rgba(248, 113, 113, 0.8)';
    ctx.fillRect(barX + Math.round(barW * 0.8), barY - 1.5, 1.5, barH + 3);

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
