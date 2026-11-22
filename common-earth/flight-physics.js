/* Pure aerodynamic flight physics & spatial solid-boundary geometry.
   Shared by Common Earth street view, 3D flight engine, and node:test suites. */
(function (root) {
  'use strict';

  const DEG = Math.PI / 180;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Solid Boundary & Layout Geometry ────────────────────────────── */

  function rectOverlaps(a, b, pad = 0) {
    return a[0] - pad < b[2] && a[2] + pad > b[0] && a[1] - pad < b[3] && a[3] + pad > b[1];
  }

  function pointInRect(p, r, pad = 0) {
    return p.x >= r[0] - pad && p.x <= r[2] + pad && p.y >= r[1] - pad && p.y <= r[3] + pad;
  }

  function resolveCircleRect(p, radius, r) {
    const cx = clamp(p.x, r[0], r[2]);
    const cy = clamp(p.y, r[1], r[3]);
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) return { hit: false, x: p.x, y: p.y };
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      const push = radius - d;
      return { hit: true, x: p.x + (dx / d) * push, y: p.y + (dy / d) * push };
    }
    // Centre is inside rect: push out via nearest edge.
    const left = Math.abs(p.x - r[0]);
    const right = Math.abs(r[2] - p.x);
    const top = Math.abs(p.y - r[1]);
    const bottom = Math.abs(r[3] - p.y);
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { hit: true, x: r[0] - radius, y: p.y };
    if (m === right) return { hit: true, x: r[2] + radius, y: p.y };
    if (m === top) return { hit: true, x: p.x, y: r[1] - radius };
    return { hit: true, x: p.x, y: r[3] + radius };
  }

  /**
   * Computes perimeter wall segments WELL OUTSIDE the town roads & parking bays.
   * Roads sit on x/y = 0..24 with HALF_ROAD = 0.87 (so road edge is -0.87..24.87).
   * Walls sit beyond -2.35 and +26.35 (expanding further with territoryLevel),
   * never overlapping Exchange St, parked vans, waterfront piers, or the Military Base.
   */
  function perimeterBounds(territoryLevel = 0, hasWaterfront = false) {
    const expand = Math.max(0, Math.floor(Number(territoryLevel) || 0)) * 6;
    return {
      minX: -7.5 - expand,
      maxX: 27.5 + expand,
      minY: -7.5 - expand,
      maxY: hasWaterfront ? 25.15 : 27.5 + expand,
      expand,
      hasWaterfront: Boolean(hasWaterfront)
    };
  }

  /**
   * Strict interior flight bounds inside the community perimeter walls (2D street units).
   * Dragons are spiritually bound inside these walls and may never travel outside them.
   */
  function communityWallBounds2D(territoryLevel = 0, hasWaterfront = false, margin = 0.85) {
    const b = perimeterBounds(territoryLevel, hasWaterfront);
    const pad = Math.max(0.2, Number(margin) || 0.85);
    return {
      minX: Number((b.minX + pad).toFixed(3)),
      maxX: Number((b.maxX - pad).toFixed(3)),
      minY: Number((b.minY + pad).toFixed(3)),
      maxY: Number((b.maxY - pad).toFixed(3)),
      wallMinX: b.minX,
      wallMaxX: b.maxX,
      wallMinY: b.minY,
      wallMaxY: b.maxY,
      hasWaterfront: b.hasWaterfront
    };
  }

  const METERS_PER_STREET_UNIT = 13;
  const MAX_WOLF_OUTSIDE_METERS = 100;
  const MAX_WOLF_OUTSIDE_UNITS = MAX_WOLF_OUTSIDE_METERS / METERS_PER_STREET_UNIT;

  function clampPointToCommunityWalls2D(x, y, territoryLevel = 0, hasWaterfront = false, margin = 0.85) {
    const wb = communityWallBounds2D(territoryLevel, hasWaterfront, margin);
    const cx = clamp(Number.isFinite(x) ? x : 12, wb.minX, wb.maxX);
    const cy = clamp(Number.isFinite(y) ? y : 12, wb.minY, wb.maxY);
    const clamped = Math.abs(cx - x) > 1e-6 || Math.abs(cy - y) > 1e-6;
    return { x: cx, y: cy, clamped, bounds: wb };
  }

  /**
   * Returns the exact Euclidean distance in meters that (x, y) lies outside the
   * community's perimeter territory bounds (0 when inside community territory).
   */
  function distanceOutsideTerritoryMeters(x, y, territoryLevel = 0, hasWaterfront = false) {
    const b = perimeterBounds(territoryLevel, hasWaterfront);
    const px = Number.isFinite(x) ? x : 12;
    const py = Number.isFinite(y) ? y : 12;
    const cx = clamp(px, b.minX, b.maxX);
    const cy = clamp(py, b.minY, b.maxY);
    return Math.hypot(px - cx, py - cy) * METERS_PER_STREET_UNIT;
  }

  /**
   * Returns the wolf roaming bounds: full community territory PLUS maximally
   * 100 meters (no more, no less) outside the community's territory boundary.
   */
  function wolfTerritoryBounds2D(territoryLevel = 0, hasWaterfront = false) {
    const b = perimeterBounds(territoryLevel, hasWaterfront);
    return {
      minX: b.minX - MAX_WOLF_OUTSIDE_UNITS,
      maxX: b.maxX + MAX_WOLF_OUTSIDE_UNITS,
      minY: b.minY - MAX_WOLF_OUTSIDE_UNITS,
      maxY: hasWaterfront ? b.maxY : b.maxY + MAX_WOLF_OUTSIDE_UNITS,
      territoryMinX: b.minX,
      territoryMaxX: b.maxX,
      territoryMinY: b.minY,
      territoryMaxY: b.maxY,
      maxOutsideMeters: MAX_WOLF_OUTSIDE_METERS,
      maxOutsideUnits: MAX_WOLF_OUTSIDE_UNITS,
      metersPerUnit: METERS_PER_STREET_UNIT,
      hasWaterfront: b.hasWaterfront
    };
  }

  /**
   * Strictly clamps a wolf's (x, y) position so it can travel freely inside community
   * territory and maximally 100.0 meters outside the community territory perimeter
   * in any direction (Euclidean distance to territory rectangle <= 100.0 m).
   */
  function clampPointToWolfTerritory2D(x, y, territoryLevel = 0, hasWaterfront = false) {
    const b = perimeterBounds(territoryLevel, hasWaterfront);
    let px = Number.isFinite(x) ? x : 12;
    let py = Number.isFinite(y) ? y : 12;
    let clamped = false;
    if (hasWaterfront && py > b.maxY) {
      py = b.maxY;
      clamped = true;
    }
    const cx = clamp(px, b.minX, b.maxX);
    const cy = clamp(py, b.minY, b.maxY);
    const dx = px - cx;
    const dy = py - cy;
    const distUnits = Math.hypot(dx, dy);
    if (distUnits > MAX_WOLF_OUTSIDE_UNITS) {
      const scale = MAX_WOLF_OUTSIDE_UNITS / distUnits;
      px = cx + dx * scale;
      py = cy + dy * scale;
      clamped = true;
    }
    const outsideMeters = Math.min(MAX_WOLF_OUTSIDE_METERS, Math.hypot(px - cx, py - cy) * METERS_PER_STREET_UNIT);
    return {
      x: px,
      y: py,
      clamped,
      outsideMeters: Number(outsideMeters.toFixed(3)),
      bounds: wolfTerritoryBounds2D(territoryLevel, hasWaterfront)
    };
  }

  /**
   * Strict 3D interior flight bounds matching flight-3d.js town scale (3.2m per street unit,
   * centered at street (12, 12) -> 3D (0, 0)).
   */
  function communityWallBounds3D(territoryLevel = 0, hasWaterfront = false, marginMeters = 3.0) {
    const b = perimeterBounds(territoryLevel, hasWaterfront);
    const scale = 3.2;
    const pad = Math.max(0.5, Number(marginMeters) || 3.0);
    const wallMinX = (b.minX - 12) * scale;
    const wallMaxX = (b.maxX - 12) * scale;
    const wallMinZ = (b.minY - 12) * scale;
    const wallMaxZ = (b.maxY - 12) * scale;
    return {
      minX: Number((wallMinX + pad).toFixed(2)),
      maxX: Number((wallMaxX - pad).toFixed(2)),
      minZ: Number((wallMinZ + pad).toFixed(2)),
      maxZ: Number((wallMaxZ - pad).toFixed(2)),
      wallMinX: Number(wallMinX.toFixed(2)),
      wallMaxX: Number(wallMaxX.toFixed(2)),
      wallMinZ: Number(wallMinZ.toFixed(2)),
      wallMaxZ: Number(wallMaxZ.toFixed(2)),
      centerX: Number((((wallMinX + wallMaxX) * 0.5)).toFixed(2)),
      centerZ: Number((((wallMinZ + wallMaxZ) * 0.5)).toFixed(2))
    };
  }

  const WALL_HEIGHT = 3.20;
  const POST_HEIGHT = 3.65;
  const GATE_HEIGHT = 3.10;
  const ZOMBIE_BASE_STACK_MIN = 3; // No less than 3 other zombies forming the vertical shoulder ladder
  const ZOMBIE_STACK_REQUIRED = 4; // 3 base zombies + 1 climbing zombie standing atop their shoulders = 4 total
  const ZOMBIE_TIER_HEIGHT = 0.82;

  function perimeterWallSegments(stage, territoryLevel = 0, hasWaterfront = false) {
    // Explicit -1 disables walls; otherwise EVERY community starts encircled by tall walls + 4 gates!
    if (stage === -1) return [];
    const b = perimeterBounds(territoryLevel, hasWaterfront);
    const thick = 0.44;
    const postSize = 0.48;
    const gateHalf = 2.4; // 4.8-unit wide road/pack gateways so Sims, vans, and wolves pass cleanly
    const midX = 12;
    const midY = 12;
    const segments = [];

    const addHorizontalSide = (side, yLine) => {
      const postLeftX = midX - gateHalf - postSize;
      const postRightX = midX + gateHalf;
      const nwLen = postLeftX - b.minX;
      const neStart = postRightX + postSize;
      const neLen = b.maxX - neStart;
      const outNy = side === 'north' ? -1 : 1;

      if (nwLen > 0.4) {
        segments.push({
          id: side + '-west', kind: 'wall', side, outNx: 0, outNy,
          x: b.minX, y: yLine - thick * 0.5, w: nwLen, d: thick, h: WALL_HEIGHT,
          box: [b.minX, yLine - thick * 0.5, b.minX + nwLen, yLine + thick * 0.5]
        });
      }
      if (neLen > 0.4) {
        segments.push({
          id: side + '-east', kind: 'wall', side, outNx: 0, outNy,
          x: neStart, y: yLine - thick * 0.5, w: neLen, d: thick, h: WALL_HEIGHT,
          box: [neStart, yLine - thick * 0.5, neStart + neLen, yLine + thick * 0.5]
        });
      }
      // Flanking tall stone gateposts
      segments.push({
        id: side + '-post-west', kind: 'post', side, outNx: 0, outNy,
        x: postLeftX, y: yLine - postSize * 0.5, w: postSize, d: postSize, h: POST_HEIGHT,
        box: [postLeftX, yLine - postSize * 0.5, postLeftX + postSize, yLine + postSize * 0.5]
      });
      segments.push({
        id: side + '-post-east', kind: 'post', side, outNx: 0, outNy,
        x: postRightX, y: yLine - postSize * 0.5, w: postSize, d: postSize, h: POST_HEIGHT,
        box: [postRightX, yLine - postSize * 0.5, postRightX + postSize, yLine + postSize * 0.5]
      });
      // Tall fortified iron-bound gate spanning the entrance (always kept closed except for community members/wolves!)
      segments.push({
        id: 'gate-' + side, kind: 'gate', side, outNx: 0, outNy,
        x: midX - gateHalf, y: yLine - 0.20, w: gateHalf * 2, d: 0.40, h: GATE_HEIGHT,
        cx: midX, cy: yLine, gateHalf,
        box: [midX - gateHalf, yLine - 0.20, midX + gateHalf, yLine + 0.20]
      });
      // Overhead stone gatehouse arch lintel
      segments.push({
        id: side + '-lintel', kind: 'arch', side,
        x: postLeftX, y: yLine - postSize * 0.5,
        w: gateHalf * 2 + postSize * 2, d: postSize, z: GATE_HEIGHT + 0.04, h: 0.34,
        box: null
      });
    };

    const addVerticalSide = (side, xLine) => {
      const postTopY = midY - gateHalf - postSize;
      const postBotY = midY + gateHalf;
      const topLen = postTopY - b.minY;
      const botStart = postBotY + postSize;
      const botLen = b.maxY - botStart;
      const outNx = side === 'west' ? -1 : 1;

      if (topLen > 0.4) {
        segments.push({
          id: side + '-north', kind: 'wall', side, outNx, outNy: 0,
          x: xLine - thick * 0.5, y: b.minY, w: thick, d: topLen, h: WALL_HEIGHT,
          box: [xLine - thick * 0.5, b.minY, xLine + thick * 0.5, b.minY + topLen]
        });
      }
      if (botLen > 0.4) {
        segments.push({
          id: side + '-south', kind: 'wall', side, outNx, outNy: 0,
          x: xLine - thick * 0.5, y: botStart, w: thick, d: botLen, h: WALL_HEIGHT,
          box: [xLine - thick * 0.5, botStart, xLine + thick * 0.5, botStart + botLen]
        });
      }
      segments.push({
        id: side + '-post-north', kind: 'post', side, outNx, outNy: 0,
        x: xLine - postSize * 0.5, y: postTopY, w: postSize, d: postSize, h: POST_HEIGHT,
        box: [xLine - postSize * 0.5, postTopY, xLine + postSize * 0.5, postTopY + postSize]
      });
      segments.push({
        id: side + '-post-south', kind: 'post', side, outNx, outNy: 0,
        x: xLine - postSize * 0.5, y: postBotY, w: postSize, d: postSize, h: POST_HEIGHT,
        box: [xLine - postSize * 0.5, postBotY, xLine + postSize * 0.5, postBotY + postSize]
      });
      segments.push({
        id: 'gate-' + side, kind: 'gate', side, outNx, outNy: 0,
        x: xLine - 0.20, y: midY - gateHalf, w: 0.40, d: gateHalf * 2, h: GATE_HEIGHT,
        cx: xLine, cy: midY, gateHalf,
        box: [xLine - 0.20, midY - gateHalf, xLine + 0.20, midY + gateHalf]
      });
      segments.push({
        id: side + '-lintel', kind: 'arch', side,
        x: xLine - postSize * 0.5, y: postTopY,
        w: postSize, d: gateHalf * 2 + postSize * 2, z: GATE_HEIGHT + 0.04, h: 0.34,
        box: null
      });
    };

    // Complete 4-sided tall perimeter wall with 4 fortified gates (North, South, West, East)
    addHorizontalSide('north', b.minY);
    addHorizontalSide('south', b.maxY);
    addVerticalSide('west', b.minX);
    addVerticalSide('east', b.maxX);

    return segments;
  }

  /**
   * Community perimeter walls and fortified gates are completely indestructible to zombies
   * (zombies cannot even put a dint in them — they must climb over via a 3-other-zombie shoulder stack).
   */
  function isWallDestroyed(site, wallId) {
    return false;
  }

  /**
   * Slab intersection test between 2D segment (ax, ay)->(bx, by) and AABB box [minX, minY, maxX, maxY]
   * inflated by `pad`. Used to detect whether an intact solid wall or building blocks a path.
   */
  function segmentIntersectsBox(ax, ay, bx, by, box, pad = 0) {
    if (!box || box.length < 4) return { hit: false, t: 1 };
    const minX = box[0] - pad;
    const minY = box[1] - pad;
    const maxX = box[2] + pad;
    const maxY = box[3] + pad;
    const dx = bx - ax;
    const dy = by - ay;
    let tMin = 0;
    let tMax = 1;
    if (Math.abs(dx) < 1e-8) {
      if (ax < minX || ax > maxX) return { hit: false, t: 1 };
    } else {
      let t1 = (minX - ax) / dx;
      let t2 = (maxX - ax) / dx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return { hit: false, t: 1 };
    }
    if (Math.abs(dy) < 1e-8) {
      if (ay < minY || ay > maxY) return { hit: false, t: 1 };
    } else {
      let t1 = (minY - ay) / dy;
      let t2 = (maxY - ay) / dy;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return { hit: false, t: 1 };
    }
    return { hit: tMin <= tMax && tMax >= 0 && tMin <= 1, t: Math.max(0, tMin) };
  }

  /**
   * Returns true ONLY if `entity` is an authorized member of `site` (its residents/Sims,
   * the player belonging to that community, or that community's Majestic Wolves).
   * Zombies and non-member outsiders are NEVER permitted through intact community gates.
   */
  function canEntityUseCommunityGate(entity, site) {
    if (!entity || !site) return false;
    const kind = String(entity.kind || entity.type || '').toLowerCase();
    if (kind === 'zombie' || kind === 'troll' || kind === 'enemy' || kind === 'outsider' || entity.hostile) {
      return false;
    }
    if (entity.homeSiteId && site.id && entity.homeSiteId !== site.id) {
      return false;
    }
    if (entity.isHome === false) return false;
    if (kind === 'wolf' || kind === 'dragon') {
      if (entity.id && Array.isArray(site.dragonStable?.dragons)) {
        const match = site.dragonStable.dragons.find(w => w && w.id === entity.id);
        if (match && match.homeSiteId && site.id && match.homeSiteId !== site.id) return false;
      }
      return true;
    }
    if (kind === 'sim' || kind === 'resident' || kind === 'player' || kind === 'member' || kind === 'vehicle') {
      return true;
    }
    return false;
  }

  /**
   * Returns true ONLY if `entity` is allowed to pass through the gate entrance (including through
   * the permanent protective magical shield that stretches across every gate entrance upon opening).
   * Even when a gate is wide open (`open === 1`), zombies, enemies, and outsiders are strictly blocked.
   */
  function canEntityCrossGateEntrance(entity, site, gateId) {
    return canEntityUseCommunityGate(entity, site);
  }

  /**
   * Pulses the protective magical shield on a gate entrance when an enemy or zombie collides with it.
   */
  function triggerGateShieldFlash(site, gateId, intensity = 1) {
    if (!site || !gateId) return;
    const rt = site._gateRuntime || (site._gateRuntime = {});
    const key = String(gateId).startsWith('gate-') ? String(gateId) : ('gate-' + String(gateId).replace(/^wall-/, ''));
    const rec = rt[key] || (rt[key] = {
      id: key,
      side: key.replace(/^gate-/, ''),
      open: 0,
      isOpen: false,
      activePassers: 0,
      shieldActive: false,
      shieldFlash: 0
    });
    rec.shieldFlash = Math.min(1.5, Math.max(rec.shieldFlash || 0, clamp(Number(intensity) || 1, 0.2, 1.5)));
  }

  /**
   * Returns all 4 fortified community gates (North, South, West, East) with their live open
   * and protective magical shield status.
   */
  function perimeterGates(territoryLevel = 0, hasWaterfront = false, site = null) {
    const segs = perimeterWallSegments(2, territoryLevel, hasWaterfront).filter(s => s.kind === 'gate');
    const rt = site?._gateRuntime || {};
    return segs.map(seg => {
      const state = rt[seg.id] || { open: 0, isOpen: false, activePassers: 0, shieldActive: false, shieldFlash: 0 };
      const openVal = clamp(Number(state.open) || 0, 0, 1);
      const isOpen = openVal > 0.02 || Boolean(state.isOpen);
      return {
        ...seg,
        destroyed: false,
        indestructible: true,
        open: openVal,
        isOpen,
        shieldActive: isOpen, // Protective magical shield permanently stretches across every gate upon opening
        shieldFlash: clamp(Number(state.shieldFlash) || 0, 0, 1.5),
        activePassers: Number(state.activePassers) || 0
      };
    });
  }

  /**
   * Updates all 4 community gates so they start CLOSED, open smoothly ONLY when an authorized
   * member (resident Sim, community player, or community Majestic Wolf) approaches to enter/exit,
   * activate a permanent protective magical shield across the open entrance to block ALL enemies/zombies,
   * and immediately close shut the moment authorized members finish passing through.
   */
  function updateCommunityGates(site, entities = [], dt = 0.016) {
    if (!site) return {};
    const tLevel = site.territoryLevel || 0;
    const hasWater = Boolean(site.water || site.coastal || root.CommonEarthSim?.waterfront?.(site));
    const gates = perimeterWallSegments(2, tLevel, hasWater).filter(s => s.kind === 'gate');
    const rt = site._gateRuntime || (site._gateRuntime = {});
    const step = clamp(Number(dt) || 0.016, 0.001, 0.25);

    for (const g of gates) {
      const rec = rt[g.id] || (rt[g.id] = {
        id: g.id,
        side: g.side,
        open: 0,
        isOpen: false,
        activePassers: 0,
        shieldActive: false,
        shieldFlash: 0
      });
      rec.destroyed = false;
      rec.shieldFlash = Math.max(0, (rec.shieldFlash || 0) - step * 2.2);
      const horiz = g.side === 'north' || g.side === 'south';
      const triggerNormal = 2.45;
      const triggerAlong = (g.gateHalf || 2.4) + 0.65;
      let passers = 0;
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (!canEntityUseCommunityGate(ent, site)) continue;
        const ex = Number(ent.x);
        const ey = Number(ent.y);
        if (!Number.isFinite(ex) || !Number.isFinite(ey)) continue;
        const dNorm = horiz ? Math.abs(ey - g.cy) : Math.abs(ex - g.cx);
        const dAlong = horiz ? Math.abs(ex - g.cx) : Math.abs(ey - g.cy);
        if (dNorm <= triggerNormal && dAlong <= triggerAlong) {
          passers++;
        }
      }
      rec.activePassers = passers;
      if (passers > 0) {
        rec.open = Math.min(1, rec.open + step * 5.8);
        rec.isOpen = true;
      } else {
        // Immediately swing closed once authorized community members finish entering/exiting!
        rec.open = Math.max(0, rec.open - step * 5.2);
        if (rec.open <= 0.02) {
          rec.open = 0;
          rec.isOpen = false;
        } else {
          rec.isOpen = true;
        }
      }
      // Permanent protective magical shield stretches across the gate entrance whenever it opens
      rec.shieldActive = rec.open > 0.02;
    }
    return rt;
  }

  /**
   * Returns currently passable openings through the community perimeter walls:
   * - For authorized community members/wolves (`forKind !== 'zombie' && forKind !== 'enemy' && forKind !== 'outsider'`): all 4 gates.
   * - For zombies, enemies, and outsiders: ZERO ground gateways (every gate entrance is sealed by
   *   a closed gate or permanent protective magical shield upon opening, and walls are indestructible!).
   */
  function perimeterGateways(stage, territoryLevel = 0, hasWaterfront = false, site = null, options = {}) {
    if (stage === -1) return [];
    const kind = String(options?.forKind || '').toLowerCase();
    const blocked = kind === 'zombie' || kind === 'enemy' || kind === 'outsider' || options?.isMember === false;
    if (blocked) return [];
    const segs = perimeterWallSegments(stage, territoryLevel, hasWaterfront);
    const gates = [];
    for (const seg of segs) {
      if (seg.kind === 'gate') {
        gates.push({
          id: seg.id,
          side: seg.side,
          x: seg.cx,
          y: seg.cy,
          gate: true,
          breach: false
        });
      }
    }
    return gates;
  }

  /**
   * Authoritative solid-object registry for a community:
   * - EVERY tall perimeter wall segment & gatepost (completely solid & indestructible to zombies!)
   * - For zombies, enemies & non-members: ALL 4 community gate entrances are ALWAYS 100% SOLID
   *   (EVEN WHEN THE GATE DOORS ARE OPEN!) due to the permanent protective magical shield across each gate!
   * - For authorized community members & wolves (`options.forKind === 'member' | 'wolf' | 'resident' | 'player'`):
   *   may pass through their own community's 4 gates while walls, posts & buildings remain 100% solid.
   * - EVERY standing building (Market, core Homes, plot buildings, freeBuildings incl. Giant Wolf Cave,
   *   playerHouses, Military Airbase structures, plus any scene-provided extra solid boxes).
   */
  function collectSolidObstacles(site, extraSolids = null, options = {}) {
    const walls = [];
    const buildings = [];
    if (!site) return { walls, buildings, all: [] };

    const fortStage = site.communityLife?.border?.defence?.stage || 0;
    const tLevel = site.territoryLevel || 0;
    const hasWater = Boolean(site.water || site.coastal || root.CommonEarthSim?.waterfront?.(site));
    const forKind = String(options?.forKind || 'zombie').toLowerCase();
    const isAuthorizedMember = (forKind === 'member' || forKind === 'wolf' || forKind === 'resident' || forKind === 'player')
      && options?.isMember !== false;

    // 1. Indestructible perimeter walls, tall gateposts, and (for ALL enemies/zombies/outsiders)
    //    all 4 magically-shielded gate entrances — solid whether the gate is closed OR wide open!
    for (const seg of perimeterWallSegments(fortStage, tLevel, hasWater)) {
      if (!seg.box) continue;
      if (seg.kind === 'gate' && isAuthorizedMember) continue;
      const sideLabel = seg.side ? (seg.side[0].toUpperCase() + seg.side.slice(1)) : '';
      const ob = {
        id: 'wall-' + seg.id,
        wallId: seg.id,
        kind: seg.kind === 'gate' ? 'gate' : (seg.kind === 'post' ? 'post' : 'wall'),
        side: seg.side || null,
        outNx: seg.outNx || 0,
        outNy: seg.outNy || 0,
        h: seg.h || WALL_HEIGHT,
        indestructible: true,
        shielded: seg.kind === 'gate',
        name: seg.kind === 'gate'
          ? (sideLabel + ' Shielded Gate')
          : (seg.kind === 'post' ? 'Stone Gatepost' : (sideLabel + ' Perimeter Wall')),
        box: seg.box,
        cx: (seg.box[0] + seg.box[2]) * 0.5,
        cy: (seg.box[1] + seg.box[3]) * 0.5,
        maxHp: Infinity
      };
      walls.push(ob);
    }

    const addBox = (id, name, cx, cy, w, d, maxHp = 180) => {
      buildings.push({
        id,
        kind: 'building',
        name,
        box: [cx - w * 0.5, cy - d * 0.5, cx + w * 0.5, cy + d * 0.5],
        cx,
        cy,
        maxHp
      });
    };

    // 2. Core district Market & Homes (matching street.js block coordinates: block * 6 + 3)
    const homesBlocks = root.EarthShifts?.district?.homes || [[1, 3], [3, 2], [3, 3]];
    const marketBlock = root.EarthShifts?.district?.market || [2, 3];
    addBox('market', 'Village Hall & Market', marketBlock[0] * 6 + 3, marketBlock[1] * 6 + 3, 3.1, 2.9, 220);
    homesBlocks.forEach((blk, idx) => {
      addBox('home-' + idx, 'Village Cottage ' + (idx + 1), blk[0] * 6 + 3, blk[1] * 6 + 3, 2.54, 2.25, 175);
    });

    // 3. Built plot buildings
    for (const b of (site.buildings || [])) {
      const plot = Number.isInteger(b.plot) ? b.plot : 0;
      const cx = (plot % 3) * 6 + 3;
      const cy = Math.floor(plot / 3) * 6 + 3;
      const w = b.kind === 'wetland' ? 2.62 : 3.12;
      const d = b.kind === 'wetland' ? 2.10 : 2.84;
      addBox(b.id || ('lot-' + plot), b.name || b.kind || 'Village Building', cx, cy, w, d, 185);
    }

    // 4. Free-placed buildings (including the Giant Wolf Cave!)
    for (const fb of (site.freeBuildings || [])) {
      if (!fb || !Number.isFinite(fb.x) || !Number.isFinite(fb.y)) continue;
      addBox(
        fb.id || ('fb-' + fb.kind),
        fb.name || (fb.kind === 'dragonStable' ? 'Giant Wolf Cave' : fb.kind) || 'Outpost Building',
        fb.x, fb.y, 3.2, 3.0,
        fb.kind === 'dragonStable' ? 320 : 180
      );
    }

    // 5. Player-built houses
    for (let i = 0; i < (site.playerHouses || []).length; i++) {
      const ph = site.playerHouses[i];
      if (!ph || !Number.isFinite(ph.x) || !Number.isFinite(ph.y)) continue;
      addBox(ph.id || ('house-' + i), ph.name || 'Forest Cabin', ph.x, ph.y, 2.6, 2.4, 170);
    }

    // 6. Military Airbase structures
    const mbLayout = militaryBaseLayout(tLevel);
    if (mbLayout?.solids) {
      mbLayout.solids.forEach((box, idx) => {
        buildings.push({
          id: 'airbase-' + idx,
          kind: 'building',
          name: 'Airbase Structure',
          box,
          cx: (box[0] + box[2]) * 0.5,
          cy: (box[1] + box[3]) * 0.5,
          maxHp: 320
        });
      });
    }

    // 7. Optional extra scene solids (venues, benches, parked vans, props from street.js)
    const gateBoxes = isAuthorizedMember
      ? perimeterWallSegments(fortStage, tLevel, hasWater).filter(s => s.kind === 'gate' && s.box).map(s => s.box)
      : [];
    if (Array.isArray(extraSolids)) {
      for (let i = 0; i < extraSolids.length; i++) {
        const b = extraSolids[i];
        if (!Array.isArray(b) || b.length < 4) continue;
        // Skip boxes already covered by walls, buildings, or member-passable community gates
        const dup = walls.some(w => Math.abs(w.box[0] - b[0]) < 0.02 && Math.abs(w.box[1] - b[1]) < 0.02 && Math.abs(w.box[2] - b[2]) < 0.02 && Math.abs(w.box[3] - b[3]) < 0.02)
          || buildings.some(o => Math.abs(o.box[0] - b[0]) < 0.02 && Math.abs(o.box[1] - b[1]) < 0.02 && Math.abs(o.box[2] - b[2]) < 0.02 && Math.abs(o.box[3] - b[3]) < 0.02)
          || gateBoxes.some(gb => Math.abs(gb[0] - b[0]) < 0.02 && Math.abs(gb[1] - b[1]) < 0.02 && Math.abs(gb[2] - b[2]) < 0.02 && Math.abs(gb[3] - b[3]) < 0.02);
        if (dup) continue;
        buildings.push({
          id: 'solid-' + i,
          kind: 'building',
          name: 'Structure',
          box: b,
          cx: (b[0] + b[2]) * 0.5,
          cy: (b[1] + b[3]) * 0.5,
          maxHp: 180
        });
      }
    }

    return { walls, buildings, all: walls.concat(buildings) };
  }

  /**
   * Sub-stepped solid-body ground motion resolver.
   * Guarantees that a moving circle (zombie, wolf, Sim) NEVER tunnels through or enters
   * ANY intact perimeter wall or solid building.
   * - Sub-steps <= 0.20 units (less than half wall thickness 0.44) so tunneling is impossible.
   * - If blocked by a solid building (not an intact wall), gently slides tangentially around
   *   its exterior edge while still strictly honoring every solid obstacle.
   * - If blocked by an intact perimeter wall, stops flush at the wall face and reports `hitWall`.
   */
  function moveWithSolidCollision(prevX, prevY, targetX, targetY, radius, obstacles, options = {}) {
    const r = Math.max(0.16, Number(radius) || 0.34);
    const list = Array.isArray(obstacles) ? obstacles : (obstacles?.all || []);
    const allowBuildingSlide = options.slideBuildings !== false;

    const resolveAt = (px, py) => {
      let x = px;
      let y = py;
      let hitWall = null;
      let hitBuilding = null;
      let hitAny = null;
      for (let iter = 0; iter < 3; iter++) {
        let movedAny = false;
        for (let i = 0; i < list.length; i++) {
          const ob = list[i];
          const box = ob.box || ob;
          const res = resolveCircleRect({ x, y }, r, box);
          if (res.hit) {
            x = res.x;
            y = res.y;
            movedAny = true;
            if (!hitAny) hitAny = ob;
            const isBarrier = ob.kind === 'wall' || ob.kind === 'post' || ob.kind === 'gate';
            if (isBarrier && !hitWall) hitWall = ob;
            if (!isBarrier && !hitBuilding) hitBuilding = ob;
          }
        }
        if (!movedAny) break;
      }
      return { x, y, hitAny, hitWall, hitBuilding };
    };

    const start = resolveAt(prevX, prevY);
    let curX = start.x;
    let curY = start.y;
    const totalDx = targetX - curX;
    const totalDy = targetY - curY;
    const totalDist = Math.hypot(totalDx, totalDy);

    if (totalDist < 1e-6) {
      return {
        x: curX,
        y: curY,
        moved: Math.hypot(curX - prevX, curY - prevY),
        blocked: Boolean(start.hitAny),
        hitObstacle: start.hitAny,
        hitWall: start.hitWall,
        hitBuilding: start.hitBuilding
      };
    }

    const substeps = Math.max(1, Math.ceil(totalDist / 0.20));
    const sx = totalDx / substeps;
    const sy = totalDy / substeps;
    let firstHit = null;
    let firstWall = null;
    let firstBuilding = null;

    for (let s = 0; s < substeps; s++) {
      const next = resolveAt(curX + sx, curY + sy);
      if (next.hitAny && !firstHit) firstHit = next.hitAny;
      if (next.hitWall && !firstWall) firstWall = next.hitWall;
      if (next.hitBuilding && !firstBuilding) firstBuilding = next.hitBuilding;
      curX = next.x;
      curY = next.y;
      // If we slammed squarely into an intact perimeter wall, stop right at the wall face!
      if (next.hitWall) break;
    }

    let moved = Math.hypot(curX - start.x, curY - start.y);

    // Tangential slide around a solid BUILDING (never around an intact wall!) so wolves & zombies
    // smoothly navigate around houses/trees/caves instead of getting stuck nose-first on a corner.
    if (allowBuildingSlide && !firstWall && firstBuilding && moved < totalDist * 0.45) {
      const nx = totalDx / totalDist;
      const ny = totalDy / totalDist;
      const slideLen = Math.min(totalDist, 0.48);
      // Try left and right perpendicular tangents; pick whichever advances closer to target without hitting a wall
      const candidates = [
        { tx: start.x - ny * slideLen, ty: start.y + nx * slideLen },
        { tx: start.x + ny * slideLen, ty: start.y - nx * slideLen }
      ];
      let bestX = curX;
      let bestY = curY;
      let bestScore = Math.hypot(targetX - curX, targetY - curY);
      for (const c of candidates) {
        const stepRes = resolveAt(c.tx, c.ty);
        if (stepRes.hitWall) continue;
        const m = Math.hypot(stepRes.x - start.x, stepRes.y - start.y);
        if (m < 0.04) continue;
        const score = Math.hypot(targetX - stepRes.x, targetY - stepRes.y) - m * 0.25;
        if (score < bestScore) {
          bestScore = score;
          bestX = stepRes.x;
          bestY = stepRes.y;
        }
      }
      curX = bestX;
      curY = bestY;
      moved = Math.hypot(curX - start.x, curY - start.y);
    }

    return {
      x: curX,
      y: curY,
      moved,
      blocked: Boolean(firstHit),
      hitObstacle: firstHit,
      hitWall: firstWall,
      hitBuilding: firstBuilding
    };
  }

  /**
   * Dedicated Military Airbase + Long Runway layout, cleanly separated from
   * perimeter walls and surrounding houses regardless of territory expansion.
   */
  function militaryBaseLayout(territoryLevel = 0) {
    const expand = Math.max(0, Math.floor(Number(territoryLevel) || 0)) * 6;
    const baseX = 35.5 + expand;
    const baseY = 12;
    // Very long paved runway running North-South along the east side of the airbase
    const runwayX = baseX + 5.6;
    const runwayWidth = 2.6;
    const runwayStartY = 0.5;
    const runwayLength = 22.0; // Long enough for realistic jet takeoff roll & climb
    const compoundBox = [baseX - 3.6, baseY - 3.6, baseX + 3.4, baseY + 3.6];
    const runwayBox = [runwayX - runwayWidth / 2, runwayStartY, runwayX + runwayWidth / 2, runwayStartY + runwayLength];
    const exclusionBox = [baseX - 5.2, runwayStartY - 2.6, runwayX + runwayWidth / 2 + 3.4, runwayStartY + runwayLength + 2.8];
    return {
      place: { x: baseX, y: baseY },
      gate: { x: baseX - 3.9, y: baseY },
      apron: { x: baseX + 2.2, y: baseY },
      runway: {
        x: runwayX,
        y: runwayStartY + runwayLength / 2,
        startY: runwayStartY,
        endY: runwayStartY + runwayLength,
        width: runwayWidth,
        length: runwayLength,
        takeoffStart: { x: runwayX, y: runwayStartY + runwayLength - 1.6 },
        takeoffEnd: { x: runwayX, y: runwayStartY + 1.6 },
        box: runwayBox
      },
      solids: [
        // Hangar solid
        [baseX - 2.35, baseY - 2.65, baseX + 0.55, baseY - 0.15],
        // Control tower + radar lab solid
        [baseX + 0.75, baseY - 2.75, baseX + 2.95, baseY + 0.85],
        // Perimeter north & south walls of airbase
        [baseX - 3.4, baseY - 3.45, baseX + 3.2, baseY - 3.05],
        [baseX - 3.4, baseY + 3.05, baseX + 3.2, baseY + 3.45]
      ],
      compoundBox,
      exclusionBox
    };
  }

  /**
   * Validates whether an arbitrary open-land building footprint at (x, y) is clear
   * of all solid obstacles, roads, walls, waterfront, and military airbase/runway.
   */
  function isLandClearForBuilding(x, y, halfW, halfD, options = {}) {
    const {
      territoryLevel = 0,
      hasWaterfront = false,
      solids = options.existingSolids || [],
      excludeRoads = true
    } = options;
    const fail = reason => ({ ok: false, clear: false, reason });
    if (!Number.isFinite(x) || !Number.isFinite(y)) return fail('Invalid coordinates.');
    const bounds = perimeterBounds(territoryLevel, hasWaterfront);
    const margin = 0.75;
    if (x - halfW < bounds.minX + margin || x + halfW > bounds.maxX - margin ||
        y - halfD < bounds.minY + margin || y + halfD > (hasWaterfront ? 24.4 : bounds.maxY - margin)) {
      return fail('Outside cleared territory bounds. Expand territory to build farther out.');
    }
    const candidate = [x - halfW, y - halfD, x + halfW, y + halfD];

    // Never overlap the Military Airbase or its long runway
    const mil = militaryBaseLayout(territoryLevel);
    if (rectOverlaps(candidate, mil.exclusionBox, 0.3)) {
      return fail('Too close to the Military Airbase and runway.');
    }

    // Never overlap main district road lanes inside [0..24]
    if (excludeRoads) {
      const roadHalf = 1.02;
      for (let r = 0; r <= 24; r += 6) {
        if (x + halfW > -0.9 && x - halfW < 24.9 && y - halfD < r + roadHalf && y + halfD > r - roadHalf) {
          return fail('Cannot build on top of a street.');
        }
        if (y + halfD > -0.9 && y - halfD < 24.9 && x - halfW < r + roadHalf && x + halfW > r - roadHalf) {
          return fail('Cannot build on top of a street.');
        }
      }
    }

    // Never overlap existing solids (buildings, walls, venues, parked vehicles, houses)
    for (const box of solids) {
      if (box && rectOverlaps(candidate, box, 0.25)) {
        return fail('Overlaps an existing building, wall, or obstacle.');
      }
    }

    return { ok: true, clear: true, reason: '' };
  }

  /* ── Aerodynamic 6-DOF Flight Physics (Dragon & Fighter Jet) ────── */

  const PROFILES = Object.freeze({
    dragon: Object.freeze({
      kind: 'dragon',
      minSpeed: 2.5,
      stallSpeed: 8.5,
      cruiseSpeed: 28.0,
      maxSpeed: 86.0,
      gravity: 15.5,
      liftCoeff: 0.048,
      dragCoeff: 0.0072,
      flapImpulseForward: 11.2,
      flapImpulseUp: 8.2,
      flapCooldown: 0.32,
      skyDashBoost: 24.0,
      pitchRate: 1.15,
      rollRate: 1.75,
      yawRate: 0.48,
      maxBankAngle: 48 * DEG,
      turnBankFactor: 1.08,
      maxPitch: 58 * DEG,
      maxRoll: 64 * DEG,
      pitchAutoTrim: 0.55,
      dihedralLevelRate: 3.8,
      inputSmoothRate: 12.0,
      angularDamping: 9.0,
      velocityBlendRate: 6.4,
      canHover: true,
      hoverDrag: 3.4,
      runwayRequired: false,
      fireRange: 105,
      fireConeRadius: 8.5
    }),
    jet: Object.freeze({
      kind: 'jet',
      minSpeed: 0,
      takeoffSpeed: 18.0,
      stallSpeed: 16.0,
      cruiseSpeed: 54.0,
      maxSpeed: 125.0,
      gravity: 19.5,
      liftCoeff: 0.028,
      dragCoeff: 0.0046,
      thrustAccel: 42.0,
      afterburnerMultiplier: 1.65,
      pitchRate: 2.05,
      rollRate: 3.1,
      yawRate: 0.95,
      turnBankFactor: 1.4,
      maxPitch: 82 * DEG,
      maxRoll: 175 * DEG,
      canHover: false,
      runwayRequired: true,
      fireRange: 145,
      fireConeRadius: 6.0
    })
  });

  function createFlightState(kindOrOptions = {}, extraOptions) {
    const options = typeof kindOrOptions === 'string'
      ? { ...(extraOptions || {}), kind: kindOrOptions }
      : (kindOrOptions || {});
    const kind = options.kind === 'jet' ? 'jet' : 'dragon';
    const profile = PROFILES[kind];
    const startAirborne = options.airborne ?? (kind === 'dragon');
    return {
      kind,
      x: Number.isFinite(options.x) ? options.x : (kind === 'jet' ? 39.1 : 12),
      y: Number.isFinite(options.y) ? options.y : (startAirborne ? 24 : 0.9),
      z: Number.isFinite(options.z) ? options.z : (kind === 'jet' ? 20.5 : 12),
      yaw: Number.isFinite(options.yaw) ? options.yaw : 0, // 0 = -Z (North)
      pitch: Number.isFinite(options.pitch) ? options.pitch : 0,
      roll: Number.isFinite(options.roll) ? options.roll : 0,
      pitchVel: 0,
      rollVel: 0,
      yawVel: 0,
      smoothPitchIn: 0,
      smoothRollIn: 0,
      smoothYawIn: 0,
      speed: Number.isFinite(options.speed) ? options.speed : (startAirborne ? profile.cruiseSpeed : 0),
      vx: 0,
      vy: 0,
      vz: 0,
      throttle: startAirborne ? 0.65 : 0.0,
      afterburner: false,
      airborne: startAirborne,
      hovering: false,
      stalling: false,
      wingPhase: 0,
      flapPulse: 0,
      flapTimer: 0,
      barrelRollTimer: 0,
      barrelRollDir: 1,
      firing: false,
      fireEnergy: 100,
      stamina: 100,
      gForce: 1.0,
      thermalLift: 0,
      distanceFlown: 0,
      maxAltitudeReached: startAirborne ? 24 : 0.9,
      fireBlasts: 0,
      targetsHit: 0
    };
  }

  /**
   * Ergonomic non-linear touch/trackpad flight stick response shaper.
   * Applies a clean radial deadzone (zero jump at onset), cubic-blended precision
   * curve for fine adjustments near centre, sensitivity scaling, and floating-origin
   * excess offset so reversing steering direction never suffers dead travel.
   */
  function shapeControlInput(dx, dy, options = {}) {
    const deadzone = Math.max(0, Number.isFinite(options.deadzone) ? options.deadzone : 14);
    const radius = Math.max(deadzone + 24, Number.isFinite(options.radius) ? options.radius : 132);
    const expo = clamp(Number.isFinite(options.expo) ? options.expo : 0.52, 0, 0.92);
    const sensitivity = clamp(Number.isFinite(options.sensitivity) ? options.sensitivity : 1.0, 0.35, 1.6);
    const maxMag = clamp(Number.isFinite(options.maxMagnitude) ? options.maxMagnitude : 1.0, 0.25, 1.0);

    const rawDx = Number.isFinite(dx) ? dx : 0;
    const rawDy = Number.isFinite(dy) ? dy : 0;
    const dist = Math.hypot(rawDx, rawDy);
    if (dist <= deadzone || dist < 1e-6) {
      return {
        x: 0,
        y: 0,
        magnitude: 0,
        clampedDx: rawDx,
        clampedDy: rawDy,
        excessX: 0,
        excessY: 0
      };
    }

    const ux = rawDx / dist;
    const uy = rawDy / dist;
    const activeSpan = radius - deadzone;
    const norm = clamp((dist - deadzone) / activeSpan, 0, 1);
    // Smooth aerodynamic precision curve: fine controllable micro-adjustments near center, progressive authority toward rim
    const curved = norm * (1 - expo) + (norm * norm) * expo;
    const scaled = clamp(curved * sensitivity, 0, maxMag);

    const clampedDist = Math.min(dist, radius);
    const excessDist = Math.max(0, dist - radius);
    return {
      x: ux * scaled,
      y: uy * scaled,
      magnitude: scaled,
      clampedDx: ux * clampedDist,
      clampedDy: uy * clampedDist,
      excessX: ux * excessDist,
      excessY: uy * excessDist
    };
  }

  function forwardVector(yaw, pitch) {
    const cp = Math.cos(pitch);
    return {
      x: -Math.sin(yaw) * cp,
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * cp
    };
  }

  /**
   * Advances aerodynamic state by dt seconds (pure, deterministic).
   * controls = { pitch (-1..1), roll (-1..1), yaw (-1..1), flap (bool),
   *              boost (bool), brake (bool), hover (bool), fire (bool),
   *              barrelRoll (bool), throttleDelta (-1..1) }
   * thermals = [{ x, z, radius, strength, maxAlt }]
   */
  function stepFlight(state, controls = {}, dt = 1 / 60, thermals = [], groundHeightAt = null) {
    const h = clamp(Number(dt) || 0, 0.001, 0.08);
    const p = PROFILES[state.kind] || PROFILES.dragon;
    const cPitch = clamp(Number(controls.pitch) || 0, -1, 1);
    const cRoll = clamp(Number(controls.roll) || 0, -1, 1);
    const cYaw = clamp(Number(controls.yaw) || 0, -1, 1);
    const boost = Boolean(controls.boost);
    const dash = Boolean(controls.dash);
    const brake = Boolean(controls.brake);
    const flap = Boolean(controls.flap);
    const hoverReq = Boolean(controls.hover) && p.canHover;
    const floorY = typeof groundHeightAt === 'function'
      ? Math.max(0.95, Number(groundHeightAt(state.x, state.z)) + 1.05)
      : 0.95;

    if (controls.barrelRoll && state.airborne && state.barrelRollTimer <= 0) {
      state.barrelRollTimer = 0.72;
      state.barrelRollDir = cRoll < 0 ? -1 : 1;
    }

    // Flap cooldown & decay
    if (state.flapTimer > 0) state.flapTimer = Math.max(0, state.flapTimer - h);
    state.flapPulse = Math.max(0, state.flapPulse - h * 2.4);

    // Check thermal updrafts (for gliding dragons & jets)
    let thermalLift = 0;
    for (const th of thermals) {
      const dx = state.x - th.x;
      const dz = state.z - th.z;
      const r = th.radius || 12;
      if (dx * dx + dz * dz <= r * r && state.y <= (th.maxAlt || 120)) {
        const falloff = 1 - Math.sqrt(dx * dx + dz * dz) / r;
        thermalLift = Math.max(thermalLift, (th.strength || 12) * (0.45 + 0.55 * falloff));
      }
    }
    state.thermalLift = thermalLift;

    // Ground roll (jet runway takeoff or dragon perched launch)
    if (!state.airborne) {
      if (state.kind === 'jet') {
        if (boost) state.throttle = clamp(state.throttle + h * 0.9, 0, 1.35);
        else if (brake) state.throttle = clamp(state.throttle - h * 1.1, 0, 1.35);
        else if (Math.abs(controls.throttleDelta || 0) > 0) {
          state.throttle = clamp(state.throttle + controls.throttleDelta * h * 0.7, 0, 1.35);
        }
        state.afterburner = state.throttle > 1.02 || boost;
        const accel = state.throttle * p.thrustAccel * (state.afterburner ? p.afterburnerMultiplier : 1) - state.speed * 0.14;
        state.speed = clamp(state.speed + accel * h, 0, p.maxSpeed);
        // Ground steering with yaw/roll
        state.yaw -= (cYaw + cRoll * 0.6) * 0.85 * h * clamp(state.speed / 12, 0.2, 1);
        state.roll = lerp(state.roll, 0, clamp(h * 8, 0, 1));
        const fwd = forwardVector(state.yaw, 0);
        state.vx = fwd.x * state.speed;
        state.vz = fwd.z * state.speed;
        state.vy = 0;
        state.x += state.vx * h;
        state.z += state.vz * h;
        state.y = 0.9;
        // Rotation & liftoff once reaching takeoffSpeed!
        if (state.speed >= p.takeoffSpeed && (cPitch > 0.1 || state.speed >= p.takeoffSpeed * 1.25)) {
          state.pitch = clamp(state.pitch + Math.max(0.35, cPitch) * 1.1 * h, 0.12, 0.45);
          state.airborne = true;
          state.y = 1.6;
          state.vy = Math.sin(state.pitch) * state.speed;
        }
      } else {
        // Dragon instant leap into sky on flap, boost, dash, or pitch up
        if (flap || boost || dash || cPitch > 0.15) {
          state.airborne = true;
          state.speed = Math.max(state.speed, dash ? 36 : 20);
          state.pitch = 0.30;
          state.vy = 10.5;
          state.y = Math.max(state.y, floorY + 1.6);
          state.flapPulse = 1.0;
          state.flapTimer = p.flapCooldown;
        } else {
          // Grounded perched dragon can walk/turn slowly anywhere on land/peaks
          state.speed = Math.max(0, state.speed - 14 * h);
          state.yaw -= (cYaw + cRoll) * 1.8 * h;
          state.roll = lerp(state.roll, 0, clamp(h * 8, 0, 1));
          state.pitch = lerp(state.pitch, 0, clamp(h * 8, 0, 1));
          state.y = lerp(state.y, floorY, clamp(h * 8, 0, 1));
        }
      }
    } else {
      // Airborne 6-DOF Aerodynamic Envelope
      state.hovering = hoverReq;

      if (state.kind === 'dragon') {
        // Intelligent Fly-by-Wire Dragon Aerodynamics:
        // 1. Actuator input smoothing (eliminates harsh touch/key jitter)
        const inAlpha = 1 - Math.exp(-(p.inputSmoothRate || 8.5) * h);
        state.smoothPitchIn = lerp(state.smoothPitchIn || 0, cPitch, inAlpha);
        state.smoothRollIn = lerp(state.smoothRollIn || 0, cRoll, inAlpha);
        state.smoothYawIn = lerp(state.smoothYawIn || 0, cYaw, inAlpha);

        // 2. Speed-adaptive aerodynamic control authority (graceful & steady at high speed, nimble when slow)
        const speedAuth = clamp(0.70 + 0.30 * (p.cruiseSpeed / Math.max(14, state.speed)), 0.62, 1.12);
        const dampAlpha = 1 - Math.exp(-(p.angularDamping || 6.4) * h);

        // 3. Smooth damped pitch rate + soft envelope cushion + gentle hands-off horizon auto-trim
        let desiredPitchVel = state.smoothPitchIn * p.pitchRate * speedAuth;
        // Soft cushion as nose approaches max climb or dive angle
        const pitchRatio = Math.abs(state.pitch) / Math.max(0.1, p.maxPitch);
        if (pitchRatio > 0.72 && Math.sign(desiredPitchVel) === Math.sign(state.pitch)) {
          desiredPitchVel *= clamp(1 - (pitchRatio - 0.72) / 0.28, 0.12, 1);
        }
        // Gentle longitudinal stability eases nose smoothly back toward level glide when hands-off
        if (Math.abs(cPitch) < 0.02 && !state.hovering && Math.abs(state.pitch) > 0.01) {
          desiredPitchVel += -state.pitch * (p.pitchAutoTrim || 0.55);
        }
        state.pitchVel = lerp(state.pitchVel || 0, desiredPitchVel, dampAlpha);
        state.pitch = clamp(state.pitch + state.pitchVel * h, -p.maxPitch, p.maxPitch);

        // 4. Target-bank aerodynamic attitude control (wings glide into natural bank angle, never flipping upside down)
        if (state.barrelRollTimer > 0) {
          state.barrelRollTimer = Math.max(0, state.barrelRollTimer - h);
          state.roll += state.barrelRollDir * (Math.PI * 2 / 0.72) * h;
          state.rollVel = 0;
          if (state.barrelRollTimer === 0) state.roll = 0;
        } else {
          const maxBank = p.maxBankAngle || (48 * DEG);
          const targetRoll = clamp(state.smoothRollIn * maxBank * speedAuth, -p.maxRoll, p.maxRoll);
          const rollStiff = Math.abs(cRoll) > 0.02 ? (p.rollRate * 2.55) : (p.dihedralLevelRate || 3.6);
          const desiredRollVel = (targetRoll - state.roll) * rollStiff;
          state.rollVel = lerp(state.rollVel || 0, desiredRollVel, dampAlpha);
          state.roll = clamp(state.roll + state.rollVel * h, -p.maxRoll, p.maxRoll);
        }

        // 5. Coordinated banked turn (horizontal lift vector drives sweeping arcs in exact harmony with bank angle)
        // In Three.js YXZ: roll < 0 drops right wing -> yaw decreases (turns right toward +X); roll > 0 drops left wing -> yaw increases (turns left toward -X)
        const turnSpeedScale = clamp(state.speed / p.cruiseSpeed, 0.45, 1.25);
        const targetYawVel = Math.sin(state.roll) * p.turnBankFactor * turnSpeedScale - state.smoothYawIn * p.yawRate;
        state.yawVel = lerp(state.yawVel || 0, targetYawVel, 1 - Math.exp(-8.0 * h));
        state.yaw += state.yawVel * h;

        // 6. Wing-flap aerodynamic thrust & Sky-Dash surge
        if ((flap || boost || dash) && state.flapTimer <= 0) {
          state.flapTimer = p.flapCooldown;
          state.flapPulse = 1.0;
          const surge = dash ? (p.skyDashBoost || 22) : p.flapImpulseForward;
          state.speed = clamp(state.speed + surge, p.minSpeed, p.maxSpeed);
          state.vy += dash ? p.flapImpulseUp * 0.55 : p.flapImpulseUp;
          state.stamina = Math.max(8, state.stamina - (dash ? 2.2 : 1.0));
        } else {
          state.stamina = Math.min(100, state.stamina + 5.5 * h);
        }

        // 7. Energy conservation: diving converts altitude into exhilarating airspeed!
        const diveAccel = -Math.sin(state.pitch) * p.gravity * 1.22;
        const drag = p.dragCoeff * state.speed * state.speed + (brake ? 18 : 0);
        const glideThrust = state.hovering ? 0 : (dash ? 28.0 : boost ? 16.5 : 6.0);
        if (state.hovering) {
          state.speed = lerp(state.speed, p.minSpeed, clamp(h * p.hoverDrag, 0, 1));
          state.pitch = lerp(state.pitch, 0.06, clamp(h * 3, 0, 1));
        } else {
          state.speed = clamp(state.speed + (glideThrust + diveAccel - drag) * h, p.minSpeed, p.maxSpeed);
        }

        const fwd = forwardVector(state.yaw, state.pitch);
        // Lift vs gravity
        const liftFactor = state.hovering ? 1.02 : clamp((state.speed * state.speed) * p.liftCoeff / p.gravity, 0.22, 1.85);
        const netVertical = state.hovering
          ? (flap || boost ? 5.5 : brake ? -5.0 : 0) + thermalLift * 0.4
          : fwd.y * state.speed + (liftFactor - 1.0) * 3.8 + state.flapPulse * 2.6 + thermalLift;

        // 8. Fluid air-mass momentum (velocity vector glides smoothly through turns instead of snapping rigidly)
        const targetVx = fwd.x * state.speed;
        const targetVz = fwd.z * state.speed;
        const horizInit = Math.hypot(state.vx || 0, state.vz || 0) < 0.05;
        const velBlend = horizInit ? 1 : (1 - Math.exp(-(p.velocityBlendRate || 5.8) * h));
        state.vx = lerp(state.vx || 0, targetVx, velBlend);
        state.vz = lerp(state.vz || 0, targetVz, velBlend);
        state.vy = lerp(state.vy, netVertical, clamp(h * 4.5, 0, 1));
        state.stalling = !state.hovering && state.speed < p.stallSpeed && state.pitch > 0.35;
        if (state.stalling) {
          state.pitch = lerp(state.pitch, -0.18, clamp(h * 2.4, 0, 1));
        }

        // Dynamic wingbeat frequency (faster on flaps/hover, graceful slow glide in dives)
        const beatRate = state.hovering ? 7.8 : (state.flapPulse > 0.15 ? 9.2 : (state.pitch < -0.18 ? 1.1 : 3.2));
        state.wingPhase += beatRate * h;
      } else {
        // Fighter Jet aerodynamics (crisp aerobatic roll/pitch envelope)
        const pitchTargetDelta = cPitch * p.pitchRate * h;
        state.pitch = clamp(state.pitch + pitchTargetDelta, -p.maxPitch, p.maxPitch);

        if (state.barrelRollTimer > 0) {
          state.barrelRollTimer = Math.max(0, state.barrelRollTimer - h);
          state.roll += state.barrelRollDir * (Math.PI * 2 / 0.72) * h;
          if (state.barrelRollTimer === 0) state.roll = 0;
        } else if (Math.abs(cRoll) > 0.01) {
          state.roll = clamp(state.roll + cRoll * p.rollRate * h, -p.maxRoll, p.maxRoll);
        } else {
          state.roll = lerp(state.roll, 0, clamp(h * 1.35, 0, 1));
        }

        const bankTurn = Math.sin(state.roll) * p.turnBankFactor * clamp(state.speed / p.cruiseSpeed, 0.35, 1.55);
        state.yaw += (bankTurn - cYaw * p.yawRate) * h;
        // Fighter Jet aerodynamics
        if (boost) state.throttle = clamp(state.throttle + h * 1.1, 0.2, 1.4);
        else if (brake) state.throttle = clamp(state.throttle - h * 1.2, 0.15, 1.4);
        else state.throttle = lerp(state.throttle, 0.72, clamp(h * 0.35, 0, 1));
        state.afterburner = state.throttle > 1.02 || boost;

        const thrust = state.throttle * p.thrustAccel * (state.afterburner ? p.afterburnerMultiplier : 1);
        const diveAccel = -Math.sin(state.pitch) * p.gravity;
        const drag = p.dragCoeff * state.speed * state.speed + (brake ? 24 : 0);
        state.speed = clamp(state.speed + (thrust + diveAccel - drag) * h, p.stallSpeed * 0.75, p.maxSpeed);

        const fwd = forwardVector(state.yaw, state.pitch);
        state.stalling = state.speed < p.stallSpeed;
        const sink = state.stalling ? -6.5 : 0;
        state.vx = fwd.x * state.speed;
        state.vz = fwd.z * state.speed;
        state.vy = fwd.y * state.speed + sink + thermalLift * 0.25;
      }

      // Integrate 3D position — ZERO horizontal or altitude cap (unrestricted flight!)
      const prevX = state.x, prevY = state.y, prevZ = state.z;
      state.x += state.vx * h;
      state.y += state.vy * h;
      state.z += state.vz * h;

      // Soft terrain floor & landing anywhere detection
      const nextFloor = typeof groundHeightAt === 'function'
        ? Math.max(0.95, Number(groundHeightAt(state.x, state.z)) + 1.05)
        : 0.95;
      if (state.y <= nextFloor) {
        state.y = nextFloor;
        if (state.pitch < 0) state.pitch = 0;
        if (brake || state.hovering || state.speed < p.stallSpeed * 0.9) {
          state.airborne = false;
          state.vy = 0;
          state.roll = 0;
          state.pitch = 0;
          state.hovering = false;
        } else {
          // Skim/bounce safely above terrain or ocean surface
          state.vy = Math.max(0, state.vy);
        }
      }

      const stepDist = Math.hypot(state.x - prevX, state.y - prevY, state.z - prevZ);
      state.distanceFlown += stepDist;
      if (state.y > state.maxAltitudeReached) state.maxAltitudeReached = state.y;

      // Apparent G-load for telemetry & subtle camera feel
      state.gForce = clamp(1.0 + Math.abs(cPitch) * (state.speed / p.cruiseSpeed) * 2.2 + Math.abs(Math.sin(state.roll)) * 1.1, 0.2, 9.0);
    }

    // Fire Breath (Dragon) or Weapons (Jet)
    state.firing = Boolean(controls.fire);
    if (state.firing) {
      state.fireEnergy = Math.max(0, state.fireEnergy - 22 * h);
    } else {
      state.fireEnergy = Math.min(100, state.fireEnergy + 30 * h);
    }

    return state;
  }

  /**
   * Computes which targets lie inside the forward fire-breath cone or jet firing ray.
   * targets = [{ id, kind, name, x, y, z, radius, hp }]
   */
  function findTargetsInFireCone(state, targets = []) {
    const p = PROFILES[state.kind] || PROFILES.dragon;
    const fwd = forwardVector(state.yaw, state.pitch);
    const hits = [];
    for (const t of targets) {
      if (!t || (t.hp != null && t.hp <= 0)) continue;
      const dx = t.x - state.x;
      const dy = (t.y || 1.2) - state.y;
      const dz = t.z - state.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 0.5 || dist > p.fireRange) continue;
      const along = dx * fwd.x + dy * fwd.y + dz * fwd.z;
      if (along <= 0) continue;
      const perpSq = Math.max(0, dist * dist - along * along);
      const coneR = p.fireConeRadius * (0.45 + 0.75 * (along / p.fireRange)) + (t.radius || 2.0);
      if (perpSq <= coneR * coneR) {
        hits.push({ target: t, distance: dist, along });
      }
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }

  /**
   * Computes compass heading (0..360° where 0=North/-Z, 90=East/+X) and
   * relative bearing (-180..+180°) + horizontal distance to any 3D landmark.
   */
  function compassBearing(state, target) {
    const headingRad = -state.yaw;
    const headingDeg = ((headingRad * 180 / Math.PI) % 360 + 360) % 360;
    if (!target) return { headingDeg, distance: 0, relativeDeg: 0 };
    const dx = target.x - state.x;
    const dz = target.z - state.z;
    const distance = Math.hypot(dx, dz);
    // Bearing from -Z clockwise toward +X
    const targetDeg = ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
    let rel = targetDeg - headingDeg;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    return { headingDeg, targetDeg, relativeDeg: rel, distance };
  }

  /**
   * Sacred Spiritual Boundary Enforcement for Enchanted Dragons:
   * Dragons are deeply spiritual beings bound to the soul of their home community
   * and refuse to enter the lands of any different community.
   * Checks all foreign community territories; if the dragon reaches one, gracefully
   * turns and guides the dragon back outside the boundary.
   */
  function enforceSacredSanctuaryBoundary(state, foreignCommunities = [], dt = 1 / 60) {
    if (!state || state.kind !== 'dragon' || !Array.isArray(foreignCommunities) || !foreignCommunities.length) {
      return { refused: false, community: null, distance: Infinity };
    }
    for (const comm of foreignCommunities) {
      if (!comm || !Number.isFinite(comm.x) || !Number.isFinite(comm.z)) continue;
      const radius = Math.max(40, comm.radius || 90);
      const dx = state.x - comm.x;
      const dz = state.z - comm.z;
      const dist = Math.hypot(dx, dz);
      if (dist < radius) {
        const nx = dist > 0.01 ? dx / dist : 0;
        const nz = dist > 0.01 ? dz / dist : 1;
        // Gently hold the dragon outside the foreign community's sacred border
        const safeR = radius + 2.5;
        state.x = comm.x + nx * safeR;
        state.z = comm.z + nz * safeR;
        // Turn dragon smoothly outward away from the foreign community
        const awayYaw = Math.atan2(-nx, -nz);
        let diff = awayYaw - state.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        state.yaw += diff * Math.min(1, 0.35 + dt * 5.0);
        state.roll = clamp(-diff * 0.45, -0.65, 0.65);
        state.pitch = clamp(Math.max(state.pitch, 0.06), -0.35, 0.45);
        state.speed = Math.max(16, state.speed * 0.92);
        return { refused: true, community: comm, distance: dist };
      }
    }
    return { refused: false, community: null, distance: Infinity };
  }

  /**
   * Strict Community Wall Boundary Enforcement for 3D Dragons:
   * Dragons are never permitted to travel outside the walls of their community.
   * Fighter jets are unaffected.
   */
  function enforceCommunityWallBoundary3D(state, wallBounds3D, dt = 1 / 60) {
    if (!state || state.kind !== 'dragon' || !wallBounds3D) {
      return { blocked: false, edge: null };
    }
    const { minX, maxX, minZ, maxZ } = wallBounds3D;
    if (![minX, maxX, minZ, maxZ].every(Number.isFinite)) {
      return { blocked: false, edge: null };
    }
    let edge = null;
    if (state.x < minX) { state.x = minX; edge = 'west'; }
    else if (state.x > maxX) { state.x = maxX; edge = 'east'; }
    if (state.z < minZ) { state.z = minZ; edge = edge ? edge + '-north' : 'north'; }
    else if (state.z > maxZ) { state.z = maxZ; edge = edge ? edge + '-south' : 'south'; }
    if (!edge) return { blocked: false, edge: null };

    // Smoothly turn the dragon inward toward the center of the community and cancel outward velocity
    const cx = Number.isFinite(wallBounds3D.centerX) ? wallBounds3D.centerX : (minX + maxX) * 0.5;
    const cz = Number.isFinite(wallBounds3D.centerZ) ? wallBounds3D.centerZ : (minZ + maxZ) * 0.5;
    const inX = cx - state.x;
    const inZ = cz - state.z;
    const inwardYaw = Math.atan2(-inX, -inZ);
    let diff = inwardYaw - state.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.yaw += diff * Math.min(1, 0.42 + dt * 5.5);
    state.roll = clamp(-diff * 0.45, -0.65, 0.65);
    state.pitch = clamp(Math.max(state.pitch, 0.04), -0.35, 0.42);
    state.speed = Math.max(14, (state.speed || 20) * 0.88);
    if (edge.includes('west') && state.vx < 0) state.vx = Math.abs(state.vx) * 0.35;
    if (edge.includes('east') && state.vx > 0) state.vx = -Math.abs(state.vx) * 0.35;
    if (edge.includes('north') && state.vz < 0) state.vz = Math.abs(state.vz) * 0.35;
    if (edge.includes('south') && state.vz > 0) state.vz = -Math.abs(state.vz) * 0.35;
    return { blocked: true, edge };
  }

  const api = Object.freeze({
    PROFILES,
    METERS_PER_STREET_UNIT,
    MAX_WOLF_OUTSIDE_METERS,
    MAX_WOLF_OUTSIDE_UNITS,
    WALL_HEIGHT,
    POST_HEIGHT,
    GATE_HEIGHT,
    ZOMBIE_BASE_STACK_MIN,
    ZOMBIE_STACK_REQUIRED,
    ZOMBIE_TIER_HEIGHT,
    rectOverlaps,
    pointInRect,
    resolveCircleRect,
    perimeterBounds,
    communityWallBounds2D,
    clampPointToCommunityWalls2D,
    distanceOutsideTerritoryMeters,
    wolfTerritoryBounds2D,
    clampPointToWolfTerritory2D,
    communityWallBounds3D,
    perimeterWallSegments,
    perimeterGates,
    canEntityUseCommunityGate,
    canEntityCrossGateEntrance,
    triggerGateShieldFlash,
    updateCommunityGates,
    isWallDestroyed,
    segmentIntersectsBox,
    perimeterGateways,
    collectSolidObstacles,
    moveWithSolidCollision,
    militaryBaseLayout,
    isLandClearForBuilding,
    createFlightState,
    shapeControlInput,
    forwardVector,
    stepFlight,
    findTargetsInFireCone,
    compassBearing,
    enforceSacredSanctuaryBoundary,
    enforceCommunityWallBoundary3D
  });

  root.EarthFlightPhysics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
