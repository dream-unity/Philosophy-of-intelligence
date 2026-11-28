// 2D Canvas Trauma Ward simulation & renderer.
// Renders 10 patient bays in two staggered clinical rows (5 Upper ICU/Resuscitation bays +
// 5 Lower Intake/Ambulance bays), each with a live scrolling ECG waveform, approaching critical
// deterioration track, non-hue-only state badge (STABLE / URGENT / CRITICAL / SAVED / MISSED),
// and zero-GC pooled stabilization/alert particles.

import { PATIENTS } from './roster.js';

// Distinct high-contrast waveform accents (paired with text/icon state so color is never sole cue)
const BAY_ACCENTS = Object.freeze([
  '#2dd4bf', // surgical teal
  '#38bdf8', // pulse sky
  '#a78bfa', // neuro violet
  '#34d399', // oxygen emerald
  '#fbbf24', // triage amber
]);

// Base deterioration duration (seconds) across 10 pace bands before Master Pace scaling.
// Gives players realistic reading & reasoning time while keeping genuine clinical urgency.
const BASE_PACE_SECONDS = Object.freeze([42, 46, 50, 54, 58, 62, 66, 70, 74, 78]);

export class TraumaWardScene {
  constructor(canvas, { onSelectPatient, onTimeout } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelectPatient = onSelectPatient || (() => {});
    this.onTimeout = onTimeout || (() => {});

    this.width = 960;
    this.height = 360;
    this.dpr = 1;

    this.mode = 'title'; // 'title' | 'playing' | 'debrief' | 'paused' | 'nback'
    this.paceMultiplier = 1.0;
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
      h: 120,
      progress: 0, // 0..1 approaching critical redline
      durationSec: BASE_PACE_SECONDS[i],
      accent: BAY_ACCENTS[i % BAY_ACCENTS.length],
      ecgPhase: i * 1.17,
      state: 'active', // 'active' | 'saved' | 'missed' | 'rival' | 'dim'
      isTarget: false,
      flashTimer: 0,
      flashColor: '#2dd4bf',
      hovered: false,
      inShortlist: true,
    }));

    // Pre-allocated zero-GC particle ring buffer (48 slots)
    this.particles = Array.from({ length: 48 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.5,
      color: '#2dd4bf',
      size: 3,
    }));
    this.particleCursor = 0;

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
    this._onPointerMove = (e) => {
      if (this.mode !== 'playing') {
        this.bays.forEach((b) => { b.hovered = false; });
        return;
      }
      const pt = this.screenToWorld(e.clientX, e.clientY);
      let anyHover = false;
      for (const bay of this.bays) {
        const hit =
          pt.x >= bay.x && pt.x <= bay.x + bay.w && pt.y >= bay.y && pt.y <= bay.y + bay.h;
        bay.hovered = hit && bay.state === 'active';
        if (bay.hovered) anyHover = true;
      }
      this.canvas.style.cursor = anyHover ? 'pointer' : 'default';
    };

    this._onPointerLeave = () => {
      this.bays.forEach((b) => { b.hovered = false; });
      this.canvas.style.cursor = 'default';
    };

    this._onPointerDown = (e) => {
      if (this.mode !== 'playing') return;
      const pt = this.screenToWorld(e.clientX, e.clientY);
      for (const bay of this.bays) {
        if (
          pt.x >= bay.x &&
          pt.x <= bay.x + bay.w &&
          pt.y >= bay.y &&
          pt.y <= bay.y + bay.h
        ) {
          if (bay.state === 'active') {
            this.onSelectPatient(bay.patient.id);
          }
          break;
        }
      }
    };

    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._ro) this._ro.disconnect();
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = rect.width > 0 ? this.width / rect.width : 1;
    const sy = rect.height > 0 ? this.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
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
    gctx.strokeStyle = 'rgba(148, 163, 184, 0.065)';
    gctx.lineWidth = 1;
    const step = 28;
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
    const compact = this.width < 560;
    const padX = compact ? 8 : Math.max(14, Math.round(this.width * 0.02));
    const padTop = 26;
    const padBottom = 10;
    const gapX = compact ? 6 : Math.max(10, Math.round(this.width * 0.014));
    const gapY = 24;

    const cols = 5;
    const rows = 2;
    const availW = this.width - padX * 2 - gapX * (cols - 1);
    const availH = this.height - padTop - padBottom - gapY * (rows - 1);
    const cardW = Math.max(54, Math.floor(availW / cols));
    const cardH = Math.max(72, Math.floor(availH / rows));

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
    if (mode !== 'playing') {
      this.canvas.style.cursor = 'default';
    }
  }

  setPaceMultiplier(mult) {
    this.paceMultiplier = Math.max(0.25, Math.min(3.0, mult));
  }

  /**
   * Configure a fresh clinical trial across the 10 bays.
   * Assigns staggered deterioration paces so targets & decoys have balanced urgency (zero pace leak).
   */
  loadTrial(trial, { useShortlist = false } = {}) {
    const targetSet = new Set(trial.targets);
    const shortlistSet = useShortlist ? new Set(trial.shortlist) : null;
    this.timeoutFired = false;

    // Shuffle pace bands evenly across all 10 bays so targets never share a giveaway speed
    const paces = BASE_PACE_SECONDS.slice();
    for (let i = paces.length - 1; i > 0; i--) {
      const j = (i * 7 + trial.tierRank * 3 + Math.floor(this.elapsedTime * 10)) % (i + 1);
      [paces[i], paces[j]] = [paces[j], paces[i]];
    }

    // Slightly faster baseline on higher tiers while staying readable
    const tierFactor = 1 - (trial.tierRank - 1) * 0.045;

    this.bays.forEach((bay, i) => {
      bay.isTarget = targetSet.has(bay.patient.id);
      bay.inShortlist = !shortlistSet || shortlistSet.has(bay.patient.id);
      bay.state = 'active';
      bay.progress = 0.04 + (i % 3) * 0.025;
      bay.durationSec = Math.max(24, paces[i] * tierFactor);
      bay.flashTimer = 0;
      bay.hovered = false;
    });
  }

  markPatientResult(patientId, isCorrect) {
    const bay = this.bays.find((b) => b.patient.id === patientId);
    if (!bay) return;
    bay.state = isCorrect ? 'saved' : 'missed';
    bay.flashTimer = 0.32;
    bay.flashColor = isCorrect ? '#2dd4bf' : '#ef4444';
    if (!isCorrect) {
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.55);
      this.hitstop = 0.045;
    }
    this._spawnParticles(
      bay.x + bay.w * 0.5,
      bay.y + bay.h * 0.5,
      isCorrect ? '#2dd4bf' : '#f59e0b',
      isCorrect ? 14 : 10
    );
  }

  revealDebrief(targets, rivalId) {
    const targetSet = new Set(targets);
    for (const bay of this.bays) {
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
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 45 + Math.random() * 85;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 0.36 + Math.random() * 0.2;
      p.color = color;
      p.size = 2 + Math.random() * 2.5;
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
      // Pace canvas repaints cleanly (~28-30fps) so ECG stays smooth without starving software compositors
      if (this.mode !== 'paused' && this.renderAccum >= 0.033) {
        this.renderAccum = 0;
        this.render();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  step(dt) {
    // Visual timers always tick in real dt
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);
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

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    if (this.mode === 'paused') return;

    this.elapsedTime += dt;

    // Gentle ECG motion in title/debrief/nback, active deterioration countdown in 'playing'
    for (const bay of this.bays) {
      const rate =
        this.mode === 'playing' && bay.state === 'active'
          ? 1.8 + bay.progress * 2.8
          : 1.3;
      bay.ecgPhase += dt * rate;

      if (this.mode === 'playing' && bay.state === 'active') {
        bay.progress += (dt * this.paceMultiplier) / bay.durationSec;
        if (bay.progress >= 1 && bay.isTarget && !this.timeoutFired) {
          bay.progress = 1;
          this.timeoutFired = true;
          this.onTimeout(bay.patient.id);
        } else if (bay.progress >= 1 && !bay.isTarget) {
          // Non-targets loop gently near 0.96 so only unaddressed true targets trigger crash timeout
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

    // Subtle camera shake on clinical miss
    if (this.shakeTrauma > 0 && !this.reducedMotion) {
      const mag = this.shakeTrauma * this.shakeTrauma * 5;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // Background: cached clinical slate telemetry grid
    if (this.gridCanvas) {
      ctx.drawImage(this.gridCanvas, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#0c131d';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Row section labels cleanly centered inside the top margin and 24px row gutter
    ctx.fillStyle = 'rgba(148, 163, 184, 0.68)';
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const firstUpper = this.bays[0];
    const firstLower = this.bays[5];
    if (firstUpper) {
      ctx.fillText('RESUSCITATION BAYS 01–05', firstUpper.x, Math.max(12, firstUpper.y - 12));
    }
    if (firstLower) {
      ctx.fillText('INTAKE & TRIAGE BAYS 06–10', firstLower.x, firstLower.y - 11);
    }

    // Draw each of the 10 patient bays
    for (const bay of this.bays) {
      this._drawBay(ctx, bay);
    }

    // Draw pooled particles
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
    ctx.restore();
  }

  _drawBay(ctx, bay) {
    const { x, y, w, h, progress, state, hovered, inShortlist } = bay;
    const isDimmed = state === 'dim' || (this.mode === 'playing' && !inShortlist);

    // Determine state visuals (never hue-only: paired with explicit text status + glyph)
    let borderColor = 'rgba(148, 163, 184, 0.22)';
    let bgFill = '#131d2b';
    let waveColor = bay.accent;
    let statusLabel = 'STABLE';
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
    } else if (this.mode === 'playing' && progress >= 0.78) {
      borderColor = '#ef4444';
      bgFill = '#1f151b';
      waveColor = '#f87171';
      statusLabel = '▲ CRITICAL';
      statusColor = '#fca5a5';
    } else if (this.mode === 'playing' && progress >= 0.5) {
      borderColor = '#f59e0b';
      bgFill = '#1a1c22';
      waveColor = '#fbbf24';
      statusLabel = '◆ URGENT';
      statusColor = '#fcd34d';
    }

    if (hovered) {
      borderColor = '#5eead4';
      bgFill = '#172736';
    }

    ctx.save();
    if (isDimmed) ctx.globalAlpha = 0.36;

    // Card surface
    this._roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = bgFill;
    ctx.fill();
    ctx.lineWidth = hovered || state === 'saved' || state === 'missed' || state === 'target-missed' ? 2 : 1;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Hit flash overlay
    if (bay.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, bay.flashTimer * 1.4);
      this._roundRect(ctx, x, y, w, h, 8);
      ctx.fillStyle = bay.flashColor;
      ctx.fill();
      ctx.restore();
    }

    // Header row: Key shortcut + Patient Name (adapts cleanly for narrow mobile cards)
    const keyNum = bay.index === 9 ? '0' : String(bay.index + 1);
    const isNarrow = w < 108;
    const pad = isNarrow ? 6 : 10;

    if (isNarrow) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${keyNum} ${bay.patient.name}`, x + pad, y + 14);
    } else {
      ctx.fillStyle = hovered ? 'rgba(45, 212, 191, 0.2)' : 'rgba(148, 163, 184, 0.12)';
      this._roundRect(ctx, x + pad, y + 7, 20, 18, 4);
      ctx.fill();
      ctx.fillStyle = hovered ? '#5eead4' : '#cbd5e1';
      ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(keyNum, x + pad + 10, y + 16.5);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 13.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(bay.patient.name, x + pad + 26, y + 16.5);

      if (w >= 136) {
        ctx.fillStyle = statusColor;
        ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(statusLabel, x + w - pad, y + 16.5);
      }
    }

    // Live procedural ECG waveform strip
    const waveX = x + pad;
    const waveW = w - pad * 2;
    const waveY = y + Math.round(h * 0.54);
    const waveAmp = Math.max(10, Math.min(18, h * 0.16));

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(waveX, waveY);
    ctx.lineTo(waveX + waveW, waveY);
    ctx.stroke();

    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    const samples = Math.max(18, Math.floor(waveW / 6));
    for (let s = 0; s <= samples; s++) {
      const u = s / samples;
      const px = waveX + u * waveW;
      const cycle = (u * 2.2 + bay.ecgPhase * 0.45) % 1;
      let py = waveY;
      if (state === 'missed') {
        // Flatline tremor
        py = waveY + Math.sin(u * 20 + bay.ecgPhase) * 1.2;
      } else {
        // Realistic P-QRS-T cardiac pulse
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

    // Bottom critical-window progress bar
    const barX = x + pad;
    const barY = y + h - 16;
    const barW = w - pad * 2;
    const barH = 6;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    this._roundRect(ctx, barX, barY, barW, barH, 3);
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
    this._roundRect(ctx, barX, barY, fillW, barH, 3);
    ctx.fill();

    // Critical threshold redline tick at 80%
    ctx.fillStyle = 'rgba(248, 113, 113, 0.75)';
    ctx.fillRect(barX + Math.round(barW * 0.8), barY - 2, 1.5, barH + 4);

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
