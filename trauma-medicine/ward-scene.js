// 2D Canvas Trauma Ward live telemetry wall.
// Desktop (>= 900px): 2 Columns x 5 Rows (Left Wall: Resus Bays 01-05 | Right Wall: Intake Bays 06-10),
// preserving exact 1↔6, 2↔7, 3↔8, 4↔9, 5↔10 corridor adjacency while showing each patient's
// phase-specific medical emergency, live ticking countdown (huge 0:24..1:56 variation), live BPM,
// ECG waveform, urgency bar, ruled-out marker, hover highlight glow, shockwaves, and floating callouts.
// Mobile / wide-strip fallback: 5 Columns x 2 Rows automatically when canvas aspect is wide.

import { PATIENTS, getPatientCondition } from './roster.js';

const BAY_ACCENTS = Object.freeze([
  '#2dd4bf', // surgical teal
  '#38bdf8', // pulse sky
  '#a78bfa', // neuro violet
  '#34d399', // oxygen emerald
  '#fbbf24', // triage amber
]);

// Wide, authentic clinical countdown spread (~24s urgent to ~116s stable at 1x speed).
// Shuffled independently across all 10 patients per case so countdowns vary dramatically with zero target leakage.
const WIDE_COUNTDOWN_SLOTS = Object.freeze([
  { rem: 24, win: 78 },  // ~69% filled -> urgent amber
  { rem: 30, win: 78 },  // ~62% filled -> urgent amber
  { rem: 37, win: 80 },  // ~54% filled -> warning amber
  { rem: 45, win: 82 },  // ~45% filled -> rising sky
  { rem: 55, win: 86 },  // ~36% filled -> moderate sky
  { rem: 66, win: 92 },  // ~28% filled -> steady teal
  { rem: 78, win: 98 },  // ~20% filled -> steady teal
  { rem: 91, win: 108 }, // ~16% filled -> stable teal
  { rem: 104, win: 116 },// ~10% filled -> stable teal
  { rem: 116, win: 126 },// ~8% filled  -> stable teal
]);

function formatCountdown(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export class TraumaWardScene {
  constructor(canvas, { onSelectPatient, onTimeout, onLayout } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelectPatient = onSelectPatient || (() => {});
    this.onTimeout = onTimeout || (() => {});
    this.onLayout = onLayout || (() => {});

    this.width = 400;
    this.height = 560;
    this.dpr = 1;
    this.orientation = 'vertical'; // 'vertical' (2x5) | 'horizontal' (5x2)

    this.mode = 'title'; // 'title' | 'playing' | 'debrief' | 'paused' | 'nback'
    this.currentPhase = 'before';
    this.paceMultiplier = 1.0;
    this.highlightedPatientId = null;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 10 patient bay entities
    this.bays = PATIENTS.map((p, i) => {
      const slot = WIDE_COUNTDOWN_SLOTS[i];
      return {
        index: i,
        patient: p,
        condition: getPatientCondition(p.id, 'before'),
        x: 0,
        y: 0,
        w: 170,
        h: 96,
        remainingSec: slot.rem,
        windowSec: slot.win,
        progress: 1 - slot.rem / slot.win,
        accent: BAY_ACCENTS[i % BAY_ACCENTS.length],
        ecgPhase: i * 1.17,
        state: 'active', // 'active' | 'saved' | 'missed' | 'target-missed' | 'rival' | 'dim'
        isTarget: false,
        flashTimer: 0,
        flashColor: '#2dd4bf',
        hovered: false,
        ruledOut: false,
        inShortlist: true,
      };
    });

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

    this.rings = [];
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
    gctx.strokeStyle = 'rgba(148, 163, 184, 0.055)';
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
    // Vertical 2x5 ICU corridor wall on desktop side-by-side layout; horizontal 5x2 on wide/mobile strips
    const isVertical = this.height >= this.width * 0.72 && this.height >= 280;
    this.orientation = isVertical ? 'vertical' : 'horizontal';

    if (isVertical) {
      const padX = 8;
      const padTop = 22;
      const padBottom = 8;
      const gapX = 8;
      const gapY = 7;
      const cols = 2;
      const rows = 5;

      const availW = this.width - padX * 2 - gapX * (cols - 1);
      const availH = this.height - padTop - padBottom - gapY * (rows - 1);
      const cardW = Math.max(90, Math.floor(availW / cols));
      const cardH = Math.max(58, Math.floor(availH / rows));
      const totalW = cardW * cols + gapX * (cols - 1);
      const totalH = cardH * rows + gapY * (rows - 1);
      const startX = Math.max(padX, Math.floor((this.width - totalW) / 2));
      const startY = padTop + Math.max(0, Math.floor((availH - totalH) / 2));

      // Column 0 = Bays 1..5 (Resuscitation Wall), Column 1 = Bays 6..10 (Intake Wall)
      // Preserves exact 1↔6, 2↔7, 3↔8, 4↔9, 5↔10 corridor adjacency!
      for (const bay of this.bays) {
        const col = bay.index < 5 ? 0 : 1;
        const row = bay.index % 5;
        bay.w = cardW;
        bay.h = cardH;
        bay.x = startX + col * (cardW + gapX);
        bay.y = startY + row * (cardH + gapY);
      }
      return;
    }

    // Horizontal 5x2 strip (mobile or title full-bleed backdrop)
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
      const row = bay.index < 5 ? 0 : 1;
      const col = bay.index % 5;
      bay.w = cardW;
      bay.h = cardH;
      bay.x = startX + col * (cardW + gapX);
      bay.y = padTop + row * (cardH + gapY);
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
    this.currentPhase = trial.phase || 'before';
    this.rings.length = 0;
    this.popups.length = 0;

    // Shuffle the 10 dramatically varied countdown slots independently across all 10 patients (0% target leakage)
    const slots = WIDE_COUNTDOWN_SLOTS.map((s) => ({ ...s }));
    let seed = (trial.tierRank * 997 + Math.floor(this.elapsedTime * 1000) + trial.id.length * 131) >>> 0;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    // Give Tiers 4-6 extra time for coupled 2-SAT cross-checks while keeping the full ~90s spread
    const tierScale = trial.tierRank >= 4 ? 1.42 : 1 - (trial.tierRank - 1) * 0.04;

    this.bays.forEach((bay, i) => {
      const slot = slots[i];
      const jitter = Math.round((nextRand() - 0.5) * 4);
      const rem = Math.max(20, Math.round(slot.rem * tierScale) + jitter);
      const win = Math.max(rem + 8, Math.round(slot.win * tierScale));

      bay.condition = getPatientCondition(bay.patient.id, this.currentPhase);
      bay.isTarget = targetSet.has(bay.patient.id);
      bay.inShortlist = !shortlistSet || shortlistSet.has(bay.patient.id);
      bay.state = 'active';
      bay.remainingSec = rem;
      bay.windowSec = win;
      bay.progress = Math.max(0.06, Math.min(0.76, 1 - rem / win));
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
        maxR: Math.max(bay.w * 0.52, 54),
        life: 0,
        maxLife: 0.42,
        color: isCorrect ? '#2dd4bf' : '#ef4444',
      });
      this.popups.push({
        x: cx,
        y: bay.y + bay.h * 0.66,
        vy: -16,
        life: 0,
        maxLife: 0.52,
        text: isCorrect ? '+SAVED!' : '✕ WRONG',
        color: isCorrect ? '#5eead4' : '#fca5a5',
      });
    }

    this._spawnParticles(cx, cy, isCorrect ? '#2dd4bf' : '#f59e0b', isCorrect ? 16 : 10);
  }

  revealDebrief(targets, rivalId) {
    this.highlightedPatientId = null;
    this.popups.length = 0;
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
          ? 1.7 + bay.progress * 3.1
          : 1.2;
      bay.ecgPhase += dt * rate;

      if (this.mode === 'playing' && bay.state === 'active') {
        bay.remainingSec = Math.max(0, bay.remainingSec - dt * this.paceMultiplier);
        bay.progress = Math.max(0.04, Math.min(1, 1 - bay.remainingSec / bay.windowSec));
        if (bay.remainingSec <= 0 && bay.isTarget && !this.timeoutFired) {
          bay.progress = 1;
          this.timeoutFired = true;
          this.onTimeout(bay.patient.id);
        } else if (bay.remainingSec <= 0 && !bay.isTarget) {
          bay.remainingSec = 0;
          bay.progress = 0.97;
        }
      } else if (this.mode === 'title') {
        const base = WIDE_COUNTDOWN_SLOTS[bay.index];
        bay.progress = Math.min(0.85, Math.max(0.08, (1 - base.rem / base.win) + 0.04 * Math.sin(this.elapsedTime * 0.6 + bay.index)));
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

    // Wall / Row headers
    ctx.fillStyle = 'rgba(148, 163, 184, 0.78)';
    ctx.font = '700 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const b0 = this.bays[0];
    const b5 = this.bays[5];

    if (this.orientation === 'vertical') {
      if (b0) ctx.fillText('RESUS BAYS 01–05', b0.x, 11);
      if (b5) ctx.fillText('INTAKE BAYS 06–10', b5.x, 11);
    } else {
      if (b0) ctx.fillText('RESUS BAYS 01–05', b0.x, Math.max(9, b0.y - 9));
      if (b5) ctx.fillText('INTAKE BAYS 06–10', b5.x, b5.y - 8);
    }

    for (const bay of this.bays) {
      this._drawBay(ctx, bay);
    }

    // Shockwave rings
    for (const ring of this.rings) {
      const alpha = Math.max(0, 1 - ring.life / ring.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.72;
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
    const { x, y, w, h, progress, remainingSec, state, hovered, inShortlist, ruledOut } = bay;
    const isDimmed = state === 'dim' || (this.mode === 'playing' && (!inShortlist || ruledOut));
    const isTallCard = h >= 76 && w >= 136;

    let borderColor = 'rgba(148, 163, 184, 0.22)';
    let bgFill = '#131d2b';
    let waveColor = bay.accent;
    let barColor = '#2dd4bf';
    const liveBpm = Math.round((bay.patient.baseBpm || 86) + progress * 48);

    let topRightText =
      this.mode === 'playing' || isTallCard
        ? formatCountdown(remainingSec)
        : `${liveBpm} BPM`;
    let topRightColor = this.mode === 'debrief' ? '#64748b' : '#cbd5e1';

    if (state === 'saved') {
      borderColor = '#2dd4bf';
      bgFill = '#0f292b';
      waveColor = '#2dd4bf';
      barColor = '#2dd4bf';
      topRightText = '✓ SAVED';
      topRightColor = '#5eead4';
    } else if (state === 'target-missed') {
      borderColor = '#38bdf8';
      bgFill = '#102438';
      waveColor = '#38bdf8';
      barColor = '#38bdf8';
      topRightText = '◎ TARGET';
      topRightColor = '#7dd3fc';
    } else if (state === 'missed') {
      borderColor = '#ef4444';
      bgFill = '#2a1519';
      waveColor = '#f87171';
      barColor = '#ef4444';
      topRightText = '✕ WRONG';
      topRightColor = '#fca5a5';
    } else if (state === 'rival') {
      borderColor = '#f59e0b';
      bgFill = '#261e12';
      waveColor = '#fbbf24';
      barColor = '#f59e0b';
      topRightText = '△ RIVAL';
      topRightColor = '#fcd34d';
    } else if (ruledOut && this.mode === 'playing') {
      borderColor = 'rgba(148, 163, 184, 0.16)';
      bgFill = '#0e1621';
      waveColor = '#64748b';
      barColor = '#475569';
      topRightText = '✕ OUT';
      topRightColor = '#64748b';
    } else if (this.mode === 'playing' && (remainingSec <= 15 || progress >= 0.78)) {
      const pulse = 0.55 + 0.45 * Math.sin(this.elapsedTime * 7);
      borderColor = `rgba(239, 68, 68, ${0.65 + pulse * 0.35})`;
      bgFill = '#22141a';
      waveColor = '#f87171';
      barColor = '#ef4444';
      topRightText = remainingSec <= 0 ? 'CRIT' : formatCountdown(remainingSec);
      topRightColor = '#fca5a5';
    } else if (this.mode === 'playing' && (remainingSec <= 38 || progress >= 0.52)) {
      borderColor = 'rgba(245, 158, 11, 0.72)';
      bgFill = '#1c1d22';
      waveColor = '#fbbf24';
      barColor = '#f59e0b';
      topRightColor = '#fcd34d';
    } else if (this.mode === 'playing' && progress >= 0.34) {
      barColor = '#38bdf8';
      topRightColor = '#bae6fd';
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
    const row1Y = y + (isTallCard ? 15 : 13);

    if (isNarrow) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${keyNum} ${bay.patient.name}`, x + pad, y + 11);
      if (this.mode === 'playing' || state !== 'active') {
        ctx.fillStyle = topRightColor;
        ctx.font = '700 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(topRightText, x + pad, y + 23);
      }
    } else {
      // Keycap
      ctx.fillStyle = hovered ? 'rgba(45, 212, 191, 0.25)' : 'rgba(148, 163, 184, 0.14)';
      this._roundRect(ctx, x + pad, row1Y - 8, 18, 16, 4);
      ctx.fill();
      ctx.fillStyle = hovered ? '#5eead4' : '#cbd5e1';
      ctx.font = '700 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(keyNum, x + pad + 9, row1Y);

      // Patient name
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(bay.patient.name, x + pad + 23, row1Y);

      // Live Countdown or Debrief Outcome on top-right
      ctx.fillStyle = topRightColor;
      ctx.font = '800 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(topRightText, x + w - pad, row1Y);

      // Row 2 (Tall ICU Wall Cards): Real Medical Emergency Condition + Live BPM
      if (isTallCard) {
        const row2Y = y + 31;
        ctx.fillStyle = state === 'active' && !ruledOut ? '#94a3b8' : '#64748b';
        ctx.font = '600 10.5px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        const maxCondW = w - pad * 2 - 58;
        let condText = bay.condition;
        while (condText.length > 6 && ctx.measureText(condText).width > maxCondW) {
          condText = condText.slice(0, -2) + '…';
        }
        ctx.fillText(condText, x + pad, row2Y);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
        ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${liveBpm} BPM`, x + w - pad, row2Y);
      }
    }

    // Live procedural ECG waveform strip
    const waveX = x + pad;
    const waveW = w - pad * 2;
    const waveY = isTallCard ? y + Math.round(h * 0.64) : y + Math.round(h * 0.56);
    const waveAmp = isTallCard ? Math.max(8, Math.min(14, h * 0.14)) : Math.max(6, Math.min(11, h * 0.16));

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(waveX, waveY);
    ctx.lineTo(waveX + waveW, waveY);
    ctx.stroke();

    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    const samples = Math.max(16, Math.floor(waveW / 5));
    for (let s = 0; s <= samples; s++) {
      const u = s / samples;
      const px = waveX + u * waveW;
      const cycle = (u * 2.1 + bay.ecgPhase * 0.45) % 1;
      let py = waveY;
      if (state === 'missed') {
        py = waveY + Math.sin(u * 20 + bay.ecgPhase) * 1.1;
      } else {
        if (cycle > 0.18 && cycle < 0.24) {
          py -= Math.sin(((cycle - 0.18) / 0.06) * Math.PI) * waveAmp * 0.28;
        } else if (cycle >= 0.30 && cycle < 0.33) {
          py += waveAmp * 0.25;
        } else if (cycle >= 0.33 && cycle < 0.38) {
          py -= Math.sin(((cycle - 0.33) / 0.05) * Math.PI) * waveAmp * 1.12;
        } else if (cycle >= 0.38 && cycle < 0.42) {
          py += waveAmp * 0.38;
        } else if (cycle >= 0.52 && cycle < 0.64) {
          py -= Math.sin(((cycle - 0.52) / 0.12) * Math.PI) * waveAmp * 0.32;
        }
      }
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // High-visibility Urgency Countdown Bar
    const barX = x + pad;
    const barY = y + h - 10;
    const barW = w - pad * 2;
    const barH = 4.5;

    ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
    this._roundRect(ctx, barX, barY, barW, barH, 2.5);
    ctx.fill();

    const fillW = Math.max(4, Math.min(barW, barW * progress));
    ctx.fillStyle = barColor;
    this._roundRect(ctx, barX, barY, fillW, barH, 2.5);
    ctx.fill();

    // Critical 78% threshold tick
    ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.fillRect(barX + barW * 0.78, barY - 1.5, 1.5, barH + 3);

    // Diagonal scratchpad strike when ruled out
    if (ruledOut && this.mode === 'playing') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.38)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + h - 12);
      ctx.lineTo(x + w - 8, y + 12);
      ctx.stroke();
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
}
