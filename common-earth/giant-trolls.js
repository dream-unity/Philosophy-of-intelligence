/* Shadowfell Darklands — Enemy Giant Troll Community.
   Colossal building-sized trolls rising from the darkness of the lands about 1 km
   out from every human community from the start of every game, marching slowly
   inward and relentlessly attacking human Sims and buildings without stopping.
   Difficult to kill with ordinary weapons; especially vulnerable to Enchanted
   Dragons and originating-community Wizards' Staff Thunder. */
(function (root) {
  'use strict';

  const COMMUNITY = Object.freeze({
    id: 'troll-darklands',
    name: 'Shadowfell Darklands',
    title: 'Enemy Giant Troll Community',
    region: 'The Darkness of the Lands',
    lore: 'Towering building-sized trolls risen from the dark reaches of the lands, marching from 1 km out to smash every building and erase all human Sims.'
  });

  const ARCHETYPES = Object.freeze([
    { name: 'Gloomcrusher', title: 'Dreadspire Giant Troll', heightMeters: 21, maxHp: 540, armor: 0.45, weapon: 'Obsidian Monolith Club', skin: '#333b37', accent: '#62705d', eye: '#ff2b1a' },
    { name: 'Nightmaw', title: 'Abyssal Colossus Troll', heightMeters: 23, maxHp: 620, armor: 0.48, weapon: 'Shattered Pillar Maul', skin: '#2a2f36', accent: '#545f69', eye: '#ff4219' },
    { name: 'Ashbone', title: 'Darklands Ravager Troll', heightMeters: 19, maxHp: 490, armor: 0.42, weapon: 'Charred Oak Greatclub', skin: '#3c3631', accent: '#6b6052', eye: '#ff341f' },
    { name: 'Mirejaw', title: 'Shadowfen Behemoth Troll', heightMeters: 22, maxHp: 580, armor: 0.46, weapon: 'Cragstone Boulder Hammer', skin: '#2b3a34', accent: '#4d6658', eye: '#ff2814' },
    { name: 'Blightfist', title: 'Ironbark Siege Troll', heightMeters: 20, maxHp: 520, armor: 0.44, weapon: 'Ruin-Beam War Club', skin: '#35313c', accent: '#5f566b', eye: '#ff4824' },
    { name: 'Grimspire', title: 'Umbral Monolith Troll', heightMeters: 24, maxHp: 660, armor: 0.50, weapon: 'Basalt Spire Crusher', skin: '#262b2d', accent: '#4f5a5d', eye: '#ff1f14' }
  ]);

  // Damage multipliers: tough against ordinary human weapons, vulnerable to Dragons & Wizards
  const SOURCE_MULTIPLIER = Object.freeze({
    militia: 0.32,
    soldier: 0.38,
    gun: 0.32,
    jet: 0.78,
    dragonFire: 1.65,
    wizardThunder: 2.40
  });

  // Scale aligned with regional-render.js (1 street unit = 0.013 km = 13 meters)
  const STREET_KM = 0.013;
  const TOWN_CENTER_X = 12;
  const TOWN_CENTER_Y = 12;
  const TOWN_PERIMETER_UNITS = 13.5; // ~175m from center
  const SPAWN_DISTANCE_KM = 1.0;
  const SPAWN_RADIUS_UNITS = TOWN_PERIMETER_UNITS + SPAWN_DISTANCE_KM / STREET_KM; // ~90.4 street units (~1.00 km from perimeter)

  // Slow, ominous heavy lumbering approach (~1.35 street units/sec < human WALK_SPEED 3.15)
  const APPROACH_SPEED = 1.35;
  const HUNT_SPEED = 1.68;

  // Relentless overhead club smash timings (windup -> strike -> recover -> repeat immediately)
  const WINDUP_SEC = 0.42;
  const STRIKE_SEC = 0.24;
  const RECOVER_SEC = 0.46;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function distanceKm(troll) {
    if (!troll || !Number.isFinite(troll.x) || !Number.isFinite(troll.y)) return 0;
    const r = Math.hypot(troll.x - TOWN_CENTER_X, troll.y - TOWN_CENTER_Y);
    return Math.max(0, Number(((r - TOWN_PERIMETER_UNITS) * STREET_KM).toFixed(3)));
  }

  function toWorld3D(x, y) {
    const dx = x - TOWN_CENTER_X;
    const dy = y - TOWN_CENTER_Y;
    const r = Math.hypot(dx, dy);
    if (r <= 0.001) return { x: 0, z: 0 };
    // Inside town (r <= 16), align 1:1 with flight-3d.js town scale (3.2m/unit).
    // Beyond town edge, each street unit maps to 13m so ~90 units = ~1018m (1.0 km).
    const r3d = r <= 16 ? r * 3.2 : 16 * 3.2 + (r - 16) * 13.0;
    return {
      x: Math.round((dx / r) * r3d),
      z: Math.round((dy / r) * r3d)
    };
  }

  function allHumanCommunities(world) {
    if (!world) return [];
    const seen = new Set();
    const list = [];
    for (const s of [...(world.sites || []), ...(world.communityLife?.outposts || [])]) {
      if (!s || !s.id || seen.has(s.id) || s.id === COMMUNITY.id) continue;
      seen.add(s.id);
      list.push(s);
    }
    return list;
  }

  function collectCommunityBuildings(site) {
    if (!site) return [];
    const list = [
      { id: 'market', name: 'Market Exchange', x: 15, y: 21, maxHp: 240 },
      { id: 'cafe', name: 'The Reading Room', x: 3, y: 20.35, maxHp: 170 },
      { id: 'nightclub', name: 'Afterglow Club', x: 21, y: 2.35, maxHp: 170 },
      { id: 'arcade', name: 'Pixel Exchange', x: 21, y: 8.35, maxHp: 170 },
      { id: 'home-0', name: 'Founding Residence North', x: 9, y: 21, maxHp: 165 },
      { id: 'home-1', name: 'Founding Residence East', x: 21, y: 15, maxHp: 165 },
      { id: 'home-2', name: 'Founding Residence South', x: 21, y: 21, maxHp: 165 }
    ];
    for (const b of site.buildings || []) {
      if (!b || !Number.isFinite(b.plot)) continue;
      const mx = (b.plot % 3) * 6 + 3;
      const my = Math.floor(b.plot / 3) * 6 + 3;
      list.push({
        id: b.id || ('plot-' + b.plot),
        name: b.name || (b.kind === 'dragonStable' ? 'Dragon Stable' : b.kind || 'Community Building'),
        x: mx,
        y: my,
        maxHp: b.kind === 'dragonStable' ? 300 : 185
      });
    }
    for (const fb of site.freeBuildings || []) {
      if (!fb || !Number.isFinite(fb.x) || !Number.isFinite(fb.y)) continue;
      list.push({
        id: fb.id || ('free-' + Math.round(fb.x) + '-' + Math.round(fb.y)),
        name: fb.name || (fb.kind === 'dragonStable' ? 'Dragon Stable' : fb.kind || 'District Building'),
        x: fb.x,
        y: fb.y,
        maxHp: fb.kind === 'dragonStable' ? 300 : 180
      });
    }
    for (let i = 0; i < (site.playerHouses || []).length; i++) {
      const h = site.playerHouses[i];
      if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y)) continue;
      list.push({
        id: h.id || ('house-' + i),
        name: h.name || ('Community House ' + (i + 1)),
        x: h.x,
        y: h.y,
        maxHp: 160
      });
    }
    if (site.militaryBase?.built) {
      const layout = root.EarthMilitaryBase?.layoutFor?.(site);
      const px = layout?.place?.x ?? 27.5;
      const py = layout?.place?.y ?? 10;
      list.push({ id: 'military-base', name: 'Military Airbase', x: px, y: py, maxHp: 280 });
    }
    return list;
  }

  function ensureDamageMap(site) {
    if (!site) return {};
    if (!site.trollDamage || typeof site.trollDamage !== 'object' || Array.isArray(site.trollDamage)) {
      site.trollDamage = {};
    }
    return site.trollDamage;
  }

  function buildingDamageSummary(site) {
    const map = site?.trollDamage || {};
    let damaged = 0;
    let ruined = 0;
    const entries = [];
    for (const entry of Object.values(map)) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.ruined) { ruined++; entries.push(entry); }
      else if (entry.hp < entry.maxHp) { damaged++; entries.push(entry); }
    }
    return { damaged, ruined, totalAffected: damaged + ruined, entries };
  }

  function makeTroll(horde, targetSite, slotIndex, week, wave) {
    horde.serial = (horde.serial || 0) + 1;
    const arch = ARCHETYPES[(horde.serial - 1) % ARCHETYPES.length];
    const waveScale = 1 + Math.min(0.45, Math.max(0, wave - 1) * 0.08);
    const maxHp = Math.round(arch.maxHp * waveScale);

    // Always spawn ~1.0 km out from the community on inland northern/western/eastern approaches
    // (keeping y < 0 so coastal settlements never spawn trolls underwater in the southern ocean).
    const approachAngles = [-2.36, -0.78, -1.58, -2.66, -0.48];
    const baseAngle = approachAngles[slotIndex % approachAngles.length];
    const angleJitter = (((horde.serial * 29) % 11) - 5) * 0.03;
    const angle = baseAngle + angleJitter;
    const distJitter = (((horde.serial * 17) % 7) - 3) * 1.1; // ±3.3 units (~±43m) around 1.00 km
    const radius = SPAWN_RADIUS_UNITS + distJitter;

    const sx = Number((TOWN_CENTER_X + Math.cos(angle) * radius).toFixed(2));
    const sy = Number((TOWN_CENTER_Y + Math.sin(angle) * radius).toFixed(2));
    const p3 = toWorld3D(sx, sy);

    return {
      id: 'troll-' + horde.serial,
      name: arch.name + (horde.serial > ARCHETYPES.length ? ' ' + Math.ceil(horde.serial / ARCHETYPES.length) : ''),
      title: arch.title,
      weapon: arch.weapon,
      skin: arch.skin,
      accent: arch.accent,
      eye: arch.eye,
      heightMeters: arch.heightMeters,
      armor: arch.armor,
      hp: maxHp,
      maxHp,
      state: 'approaching', // 'approaching' | 'hunting' | 'attacking' | 'slain'
      attackPhase: 'march', // 'march' | 'chase' | 'windup' | 'strike' | 'recover'
      attackTimer: 0,
      attackProgress: 0,
      targetSiteId: targetSite.id,
      targetSiteName: targetSite.name || 'Human Settlement',
      isPlayerTarget: Boolean(targetSite._isPlayer),
      targetKind: null, // 'sim' | 'building'
      targetId: null,
      targetName: null,
      targetX: TOWN_CENTER_X,
      targetY: TOWN_CENTER_Y,
      facingX: Number((-Math.cos(angle)).toFixed(3)),
      facingY: Number((-Math.sin(angle)).toFixed(3)),
      x: sx,
      y: sy,
      worldX: p3.x,
      worldZ: p3.z,
      distanceKm: distanceKm({ x: sx, y: sy }),
      swingPhase: (horde.serial * 1.1) % (Math.PI * 2),
      stepDustTimer: 0.4,
      burnedWeek: -10,
      humansKilled: 0,
      buildingsSmashed: 0,
      strikesLanded: 0,
      wave,
      spawnedWeek: week || 1
    };
  }

  function ensure(world) {
    if (!world) return null;
    const communities = allHumanCommunities(world);
    if (!world.trollHorde) {
      world.trollHorde = {
        community: {
          ...COMMUNITY,
          wave: 1,
          totalSlain: 0,
          humansLost: 0,
          buildingsRuined: 0,
          attacksLaunched: 0,
          spawnedWeek: world.week || 1
        },
        serial: 0,
        trolls: [],
        log: []
      };
    }
    const horde = world.trollHorde;
    horde.community ||= { ...COMMUNITY, wave: 1, totalSlain: 0, humansLost: 0, buildingsRuined: 0, attacksLaunched: 0, spawnedWeek: world.week || 1 };
    horde.community.buildingsRuined ||= 0;
    horde.trolls ||= [];
    horde.log ||= [];

    // Immediately launch attacks from 1 km out at the start of every game once a community exists
    if (communities.length > 0 && horde.trolls.length === 0) {
      const active = communities.find(s => s.id === world.activeId) || communities[0];
      const others = communities.filter(s => s.id !== active.id);
      // 2 colossal building-sized Giant Trolls start ~1 km out marching slowly toward the player's community
      horde.trolls.push(makeTroll(horde, { ...active, _isPlayer: true }, 0, world.week || 1, 1));
      horde.trolls.push(makeTroll(horde, { ...active, _isPlayer: true }, 1, world.week || 1, 1));
      // Simultaneously dispatch Giant Trolls against neighbouring / other human communities across the lands
      if (others.length > 0) {
        horde.trolls.push(makeTroll(horde, { ...others[0], _isPlayer: false }, 2, world.week || 1, 1));
        if (others.length > 1) {
          horde.trolls.push(makeTroll(horde, { ...others[1], _isPlayer: false }, 3, world.week || 1, 1));
        }
      } else {
        horde.trolls.push(makeTroll(horde, { id: 'frontier-lands', name: 'Neighbouring Human Lands', _isPlayer: false }, 2, world.week || 1, 1));
      }
      horde.community.attacksLaunched += horde.trolls.length;
      record(horde, world.week || 1,
        'From the darkness 1 km outside the lands, the ' + COMMUNITY.name + ' Giant Trolls emerged! Building-sized titans are marching slowly toward ' +
        active.name + ' and neighbouring human communities!'
      );
    }
    return horde;
  }

  function record(horde, week, text) {
    if (!horde) return;
    horde.log.unshift({ week: week || 1, text });
    if (horde.log.length > 36) horde.log.length = 36;
  }

  function activeTrolls(world) {
    const horde = world?.trollHorde;
    if (!horde?.trolls) return [];
    return horde.trolls.filter(t => t && t.state !== 'slain' && t.hp > 0);
  }

  function trollsForSite(world, siteId) {
    if (!siteId) return [];
    return activeTrolls(world).filter(t => t.targetSiteId === siteId);
  }

  function summary(world, siteId) {
    const horde = world?.trollHorde;
    const allAlive = activeTrolls(world);
    const local = siteId ? allAlive.filter(t => t.targetSiteId === siteId) : [];
    const elsewhere = siteId ? allAlive.filter(t => t.targetSiteId !== siteId) : allAlive;
    const site = siteId ? allHumanCommunities(world).find(s => s.id === siteId) : null;
    const approachingLocal = local.filter(t => t.state === 'approaching');
    const attackingLocal = local.filter(t => t.state !== 'approaching');
    const nearestKm = local.length
      ? Math.min(...local.map(t => distanceKm(t)))
      : null;
    const dmg = buildingDamageSummary(site);
    return {
      communityName: COMMUNITY.name,
      wave: horde?.community?.wave || 1,
      totalSlain: horde?.community?.totalSlain || 0,
      humansLost: horde?.community?.humansLost || 0,
      buildingsRuined: horde?.community?.buildingsRuined || 0,
      localCount: local.length,
      approachingCount: approachingLocal.length,
      attackingCount: attackingLocal.length,
      nearestKm,
      damagedBuildings: dmg.damaged,
      ruinedBuildings: dmg.ruined,
      elsewhereCount: elsewhere.length,
      totalAlive: allAlive.length,
      local,
      elsewhere,
      recentLog: horde?.log?.[0]?.text || ''
    };
  }

  function pickTargetForTroll(troll, site, buildings, sims) {
    const dmgMap = ensureDamageMap(site);
    let best = null;
    let bestScore = Infinity;

    // 1. Scan ALL living human Sims — any Sim the troll comes across becomes an immediate priority target!
    for (const s of sims) {
      if (!s || s.downed || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      // Only hunt Sims inside or near the community land
      if (s.y > 25.4) continue;
      const d = Math.hypot(s.x - troll.x, s.y - troll.y);
      const isCurrent = troll.targetKind === 'sim' && troll.targetId === s.id;
      // Strong hunter priority when a human Sim is within 7.5 street units (~100m)
      let score = d <= 7.5 ? d * 0.52 : d * 0.95;
      if (isCurrent) score -= 1.8;
      if (score < bestScore) {
        bestScore = score;
        best = { kind: 'sim', id: s.id, name: s.name || 'Human Sim', x: s.x, y: s.y, isPlayer: Boolean(s.isPlayer) };
      }
    }

    // 2. Scan ALL standing community buildings — smash everything in the community relentlessly!
    for (const b of buildings) {
      const rec = dmgMap[b.id];
      if (rec && rec.ruined) continue;
      const d = Math.hypot(b.x - troll.x, b.y - troll.y);
      const isCurrent = troll.targetKind === 'building' && troll.targetId === b.id;
      let score = d;
      if (isCurrent) score -= 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = { kind: 'building', id: b.id, name: b.name, x: b.x, y: b.y, maxHp: b.maxHp };
      }
    }

    // 3. Even if all buildings are ruined and no active Sims were passed, never stop — keep smashing the heart of town!
    if (!best && buildings.length > 0) {
      const fallback = buildings[(Math.floor(troll.strikesLanded || 0)) % buildings.length];
      best = { kind: 'building', id: fallback.id, name: fallback.name, x: fallback.x, y: fallback.y, maxHp: fallback.maxHp, rubble: true };
    }
    return best;
  }

  function executeTrollStrike(world, horde, site, troll, target, events) {
    const week = world.week || 1;
    troll.strikesLanded = (troll.strikesLanded || 0) + 1;

    if (target.kind === 'sim') {
      const isPlayer = Boolean(target.isPlayer);
      const pop = site.population || 0;
      const floor = site.id === world.activeId ? 1 : 0;
      const killed = !isPlayer && pop > floor;
      if (killed) {
        site.population = Math.max(floor, pop - 1);
        troll.humansKilled = (troll.humansKilled || 0) + 1;
        horde.community.humansLost = (horde.community.humansLost || 0) + 1;
      }
      site.wellbeing = clamp((site.wellbeing || 50) - (isPlayer ? 2 : 1), 0, 100);
      const msg = isPlayer
        ? troll.name + ' (' + troll.heightMeters + 'm Giant Troll) slammed ' + target.name + ' with its ' + troll.weapon + '!'
        : troll.name + ' (' + troll.heightMeters + 'm Giant Troll) hunted down and smashed ' + target.name + ' in ' + site.name + '!';
      record(horde, week, msg);
      events.push({
        type: 'simStrike',
        troll,
        simId: target.id,
        simName: target.name,
        x: target.x,
        y: target.y,
        isPlayer,
        killed,
        message: msg
      });
      return;
    }

    // Building strike — real structural destruction!
    const dmgMap = ensureDamageMap(site);
    const maxHp = target.maxHp || 180;
    const rec = dmgMap[target.id] || (dmgMap[target.id] = {
      id: target.id,
      name: target.name,
      x: target.x,
      y: target.y,
      hp: maxHp,
      maxHp,
      burning: false,
      ruined: false
    });
    const smashDmg = 34 + Math.round(Math.max(0, (troll.heightMeters || 21) - 19) * 3);
    const wasRuined = Boolean(rec.ruined);
    rec.hp = Math.max(0, rec.hp - smashDmg);
    rec.burning = true;
    const justRuined = !wasRuined && rec.hp <= 0;
    if (justRuined) {
      rec.ruined = true;
      troll.buildingsSmashed = (troll.buildingsSmashed || 0) + 1;
      horde.community.buildingsRuined = (horde.community.buildingsRuined || 0) + 1;
      if ((site.materials || 0) > 0) site.materials = Math.max(0, site.materials - 1);
      site.wellbeing = clamp((site.wellbeing || 50) - 2, 0, 100);
      site.trust = clamp((site.trust || 50) - 1, 0, 100);
      const ruinMsg = troll.name + ' smashed ' + rec.name + ' into smoking ruins in ' + site.name + '!';
      record(horde, week, ruinMsg);
      // Immediately clear lock so the troll storms straight onto the next building or Sim!
      troll.targetId = null;
      troll.targetKind = null;
      events.push({
        type: 'buildingStrike',
        troll,
        buildingId: rec.id,
        buildingName: rec.name,
        x: rec.x,
        y: rec.y,
        damage: smashDmg,
        hp: 0,
        maxHp: rec.maxHp,
        ruined: true,
        justRuined: true,
        message: ruinMsg
      });
      return;
    }

    if ((troll.strikesLanded % 3) === 0 && (site.materials || 0) > 1) {
      site.materials = Math.max(1, site.materials - 1);
    }
    events.push({
      type: 'buildingStrike',
      troll,
      buildingId: rec.id,
      buildingName: rec.name,
      x: rec.x,
      y: rec.y,
      damage: smashDmg,
      hp: rec.hp,
      maxHp: rec.maxHp,
      ruined: Boolean(rec.ruined),
      justRuined: false,
      message: troll.name + ' battered ' + rec.name + ' (-' + smashDmg + ' HP)!'
    });
  }

  function stepLive(world, site, dt, sceneContext) {
    if (!world || !site) return [];
    const horde = ensure(world);
    const local = trollsForSite(world, site.id);
    if (!local.length) return [];

    const events = [];
    const step = clamp(dt || 0.016, 0.001, 0.25);
    const buildings = (sceneContext?.buildings && sceneContext.buildings.length)
      ? sceneContext.buildings
      : collectCommunityBuildings(site);
    const sims = Array.isArray(sceneContext?.sims)
      ? sceneContext.sims
      : (site.residents || []).map((r, idx) => ({
          id: r.id,
          name: r.name,
          x: 9 + (idx % 3) * 5,
          y: 16 + Math.floor(idx / 3) * 3,
          isPlayer: false,
          downed: false
        }));

    for (let i = 0; i < local.length; i++) {
      const t = local[i];
      const km = distanceKm(t);
      t.distanceKm = km;

      // PHASE 1: Long slow march from ~1 km out until reaching the community perimeter
      if (t.state === 'approaching' && km > 0.025) {
        const entryTarget = pickTargetForTroll(t, site, buildings, sims) || { x: TOWN_CENTER_X, y: TOWN_CENTER_Y, name: site.name, kind: 'building', id: 'market' };
        const dx = entryTarget.x - t.x;
        const dy = entryTarget.y - t.y;
        const dist = Math.hypot(dx, dy) || 1;
        t.facingX = Number((dx / dist).toFixed(3));
        t.facingY = Number((dy / dist).toFixed(3));
        t.targetKind = entryTarget.kind;
        t.targetId = entryTarget.id;
        t.targetName = entryTarget.name;
        t.targetX = entryTarget.x;
        t.targetY = entryTarget.y;
        t.attackPhase = 'march';
        t.attackProgress = 0;

        // Heavy deliberate walk from 1 km out
        t.x = Number((t.x + (dx / dist) * APPROACH_SPEED * step).toFixed(3));
        t.y = Number((t.y + (dy / dist) * APPROACH_SPEED * step).toFixed(3));
        t.swingPhase = ((t.swingPhase || 0) + step * 2.15) % (Math.PI * 2);
        t.stepDustTimer = (t.stepDustTimer || 0.6) - step;
        if (t.stepDustTimer <= 0) {
          t.stepDustTimer = 0.72;
          events.push({ type: 'footstep', troll: t, x: t.x, y: t.y });
        }

        t.distanceKm = distanceKm(t);
        const p3 = toWorld3D(t.x, t.y);
        t.worldX = p3.x;
        t.worldZ = p3.z;

        if (t.distanceKm <= 0.025) {
          t.state = 'hunting';
          t.attackPhase = 'chase';
          const breachMsg = 'BREACH! ' + t.name + ' (' + t.heightMeters + 'm Giant Troll) reached ' + site.name + ' and began smashing buildings and hunting Sims!';
          record(horde, world.week || 1, breachMsg);
          events.push({ type: 'breach', troll: t, x: t.x, y: t.y, message: breachMsg });
        }
        continue;
      }

      // Ensure transitioned trolls never stay stuck in 'approaching' once at perimeter
      if (t.state === 'approaching') {
        t.state = 'hunting';
        t.attackPhase = 'chase';
      }

      // PHASE 2: Relentless hunting & merciless smashing of Sims and Buildings
      const target = pickTargetForTroll(t, site, buildings, sims);
      if (!target) continue;

      t.targetKind = target.kind;
      t.targetId = target.id;
      t.targetName = target.name;
      t.targetX = target.x;
      t.targetY = target.y;

      const dx = target.x - t.x;
      const dy = target.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        t.facingX = Number((dx / dist).toFixed(3));
        t.facingY = Number((dy / dist).toFixed(3));
      }

      const contactRange = target.kind === 'sim' ? 1.75 : 2.55;

      // Active windup -> strike -> recover attack cycle
      if (t.attackPhase === 'windup' || t.attackPhase === 'strike' || t.attackPhase === 'recover') {
        t.state = 'attacking';
        // Keep lunging slightly closer during windup if a Sim tries to run
        if (t.attackPhase === 'windup' && dist > contactRange * 0.85) {
          const lunge = HUNT_SPEED * 0.45 * step;
          t.x = Number((t.x + (dx / Math.max(0.01, dist)) * lunge).toFixed(3));
          t.y = Number((t.y + (dy / Math.max(0.01, dist)) * lunge).toFixed(3));
        }

        t.attackTimer = (t.attackTimer || 0) + step;
        if (t.attackPhase === 'windup') {
          t.attackProgress = clamp(t.attackTimer / WINDUP_SEC, 0, 1);
          if (t.attackTimer >= WINDUP_SEC) {
            t.attackPhase = 'strike';
            t.attackTimer = 0;
            t.attackProgress = 0;
            // Land the devastating slam if target is still in strike reach (generous splash radius for 22m club!)
            const strikeReach = target.kind === 'sim' ? 3.1 : 3.6;
            if (dist <= strikeReach) {
              executeTrollStrike(world, horde, site, t, target, events);
            } else {
              events.push({ type: 'slam', troll: t, x: t.x + t.facingX * 1.4, y: t.y + t.facingY * 1.4 });
            }
          }
        } else if (t.attackPhase === 'strike') {
          t.attackProgress = clamp(t.attackTimer / STRIKE_SEC, 0, 1);
          if (t.attackTimer >= STRIKE_SEC) {
            t.attackPhase = 'recover';
            t.attackTimer = 0;
            t.attackProgress = 0;
          }
        } else if (t.attackPhase === 'recover') {
          t.attackProgress = clamp(t.attackTimer / RECOVER_SEC, 0, 1);
          if (t.attackTimer >= RECOVER_SEC) {
            // Immediately continue smashing or chase the next victim — NEVER pause idly!
            const nextTarget = pickTargetForTroll(t, site, buildings, sims);
            const nextDist = nextTarget ? Math.hypot(nextTarget.x - t.x, nextTarget.y - t.y) : Infinity;
            const nextRange = nextTarget?.kind === 'sim' ? 1.75 : 2.55;
            if (nextTarget && nextDist <= nextRange + 0.4) {
              t.attackPhase = 'windup';
              t.attackTimer = 0;
              t.attackProgress = 0;
            } else {
              t.state = 'hunting';
              t.attackPhase = 'chase';
              t.attackTimer = 0;
              t.attackProgress = 0;
            }
          }
        }
      } else if (dist > contactRange) {
        // Charge straight at the Sim or building!
        t.state = 'hunting';
        t.attackPhase = 'chase';
        t.attackProgress = 0;
        const moveDist = Math.min(dist - contactRange * 0.7, HUNT_SPEED * step);
        if (moveDist > 0) {
          t.x = Number((t.x + (dx / dist) * moveDist).toFixed(3));
          t.y = Number((t.y + (dy / dist) * moveDist).toFixed(3));
        }
        t.swingPhase = ((t.swingPhase || 0) + step * 3.1) % (Math.PI * 2);
        t.stepDustTimer = (t.stepDustTimer || 0.5) - step;
        if (t.stepDustTimer <= 0) {
          t.stepDustTimer = 0.52;
          events.push({ type: 'footstep', troll: t, x: t.x, y: t.y });
        }
      } else {
        // Reached melee contact — start overhead war-club smash IMMEDIATELY!
        t.state = 'attacking';
        t.attackPhase = 'windup';
        t.attackTimer = 0;
        t.attackProgress = 0;
      }

      t.distanceKm = distanceKm(t);
      const p3 = toWorld3D(t.x, t.y);
      t.worldX = p3.x;
      t.worldZ = p3.z;
    }
    return events;
  }

  function repairBuildings(world, site) {
    if (!world || !site) return { ok: false, message: 'No active community.' };
    const map = site.trollDamage;
    if (!map) return { ok: false, message: 'All buildings in ' + site.name + ' are intact.' };
    const broken = Object.values(map).filter(e => e && (e.ruined || e.hp < e.maxHp));
    if (!broken.length) return { ok: false, message: 'All buildings in ' + site.name + ' are intact.' };

    const matCost = Math.min(site.materials || 0, Math.min(3, broken.length));
    if (matCost > 0) site.materials = Math.max(0, (site.materials || 0) - matCost);
    for (const e of broken) {
      e.hp = e.maxHp;
      e.burning = false;
      e.ruined = false;
    }
    const msg = site.name + ' crews repaired ' + broken.length + ' troll-damaged building' + (broken.length > 1 ? 's' : '') + (matCost > 0 ? ' (-' + matCost + ' materials).' : '.');
    record(ensure(world), world.week || 1, msg);
    return { ok: true, repaired: broken.length, message: msg };
  }

  function attackTroll(world, site, trollId, opts = {}) {
    if (!world || !site) return { ok: false, message: 'No active community under siege.' };
    const horde = ensure(world);
    const local = trollsForSite(world, site.id);
    const troll = trollId
      ? horde.trolls.find(t => t.id === trollId && t.state !== 'slain' && t.hp > 0)
      : local[0];
    if (!troll) {
      return { ok: false, message: 'No living Giant Troll is currently attacking ' + site.name + '.' };
    }

    const source = opts.source || 'militia';
    const mult = SOURCE_MULTIPLIER[source] ?? 0.35;
    const raw = Number.isFinite(opts.damage) ? opts.damage : (
      source === 'wizardThunder' ? 92
        : source === 'dragonFire' ? 72
          : source === 'jet' ? 80
            : 75
    );
    const dealt = Math.max(12, Math.round(raw * mult));
    troll.hp = Math.max(0, troll.hp - dealt);
    if (source === 'dragonFire') {
      troll.burnedWeek = world.week || 1;
    }

    const killed = troll.hp <= 0;
    if (killed) {
      troll.state = 'slain';
      horde.community.totalSlain = (horde.community.totalSlain || 0) + 1;
      site.trust = clamp((site.trust || 50) + 4, 0, 100);
      site.wellbeing = clamp((site.wellbeing || 50) + 4, 0, 100);
      site.funds = (site.funds || 0) + 3;
      const slayer = opts.wizardName && opts.dragonName
        ? opts.wizardName + ' and ' + opts.dragonName
        : opts.autonomous && opts.dragonName
          ? opts.dragonName + ' (acting on its own free will)'
          : opts.dragonName || opts.attackerName || (site.name + ' defenders');
      const msg = opts.autonomous && opts.dragonName
        ? 'Colossal Victory! ' + opts.dragonName + ' instinctively swooped down and incinerated ' + troll.name + ' the Giant Troll (' + troll.heightMeters + 'm) defending ' + site.name + '! (+3 funds, +4 trust)'
        : 'Colossal Victory! ' + slayer + ' slew ' + troll.name + ' the Giant Troll (' + troll.heightMeters + 'm) defending ' + site.name + '! (+3 funds, +4 trust)';
      record(horde, world.week || 1, msg);
      return { ok: true, troll, dealt, killed: true, hp: 0, maxHp: troll.maxHp, message: msg };
    }

    const pct = Math.ceil((troll.hp / troll.maxHp) * 100);
    let msg;
    if (source === 'wizardThunder') {
      msg = (opts.wizardName || 'Wizard') + '\'s Protective Staff Thunder shattered ' + troll.name + '\'s dark hide for ' + dealt + ' damage! (' + troll.hp + '/' + troll.maxHp + ' HP · ' + pct + '%)';
    } else if (source === 'dragonFire' && opts.autonomous) {
      msg = (opts.dragonName || 'Dragon') + ' acted on its own free will and blasted ' + troll.name + ' with blazing dragonfire for ' + dealt + ' damage! (' + troll.hp + '/' + troll.maxHp + ' HP)';
    } else if (source === 'dragonFire') {
      msg = (opts.dragonName || 'Dragon') + '\'s enchanted dragonfire seared ' + troll.name + ' for ' + dealt + ' damage and halted dark regeneration! (' + troll.hp + '/' + troll.maxHp + ' HP)';
    } else if (source === 'jet') {
      msg = 'Fighter jet ordnance struck ' + troll.name + ' for ' + dealt + ' damage! (' + troll.hp + '/' + troll.maxHp + ' HP)';
    } else {
      msg = site.name + ' defenders struck ' + troll.name + ', dealing only ' + dealt + ' damage against its colossal dark hide (' + troll.hp + '/' + troll.maxHp + ' HP). Dragons & Wizards are far more effective!';
    }
    record(horde, world.week || 1, msg);
    return { ok: true, troll, dealt, killed: false, hp: troll.hp, maxHp: troll.maxHp, message: msg };
  }

  function tick(world) {
    if (!world) return [];
    const horde = ensure(world);
    const communities = allHumanCommunities(world);
    if (!communities.length) return [];

    const byId = new Map(communities.map(s => [s.id, s]));
    const reports = [];
    const week = world.week || 1;

    for (const troll of activeTrolls(world)) {
      if ((troll.burnedWeek ?? -10) < week - 1 && troll.hp < troll.maxHp) {
        troll.hp = Math.min(troll.maxHp, troll.hp + 30);
      }

      let target = byId.get(troll.targetSiteId);
      if (!target || (target.population || 0) <= 0) {
        target = communities.find(s => (s.population || 0) > 1) || communities[0];
        if (target) {
          troll.targetSiteId = target.id;
          troll.targetSiteName = target.name;
        }
      }
      if (!target) continue;

      // Advance approaching trolls inward by ~0.55 km per weekly turn until they reach the community!
      const kmNow = distanceKm(troll);
      if (troll.state === 'approaching' && kmNow > 0.03) {
        const dx = TOWN_CENTER_X - troll.x;
        const dy = TOWN_CENTER_Y - troll.y;
        const dist = Math.hypot(dx, dy) || 1;
        const stepUnits = Math.min(Math.max(0, dist - (TOWN_PERIMETER_UNITS - 1.5)), 0.55 / STREET_KM);
        troll.x = Number((troll.x + (dx / dist) * stepUnits).toFixed(2));
        troll.y = Number((troll.y + (dy / dist) * stepUnits).toFixed(2));
        troll.distanceKm = distanceKm(troll);
        const p3 = toWorld3D(troll.x, troll.y);
        troll.worldX = p3.x;
        troll.worldZ = p3.z;
        if (troll.distanceKm > 0.03) {
          const marchNote = troll.name + ' (' + troll.heightMeters + 'm Giant Troll) closed to ' + troll.distanceKm.toFixed(2) + ' km outside ' + target.name + '!';
          record(horde, week, marchNote);
          reports.push({ site: target, text: marchNote });
          continue;
        }
        troll.state = 'hunting';
        troll.attackPhase = 'chase';
      }

      const dragons = target.dragonStable?.dragons?.length || 0;
      const wizards = target.dragonStable?.wizards?.length || 0;
      const soldiers = target.militaryBase?.units?.filter(u => u.type === 'soldier')?.length || 0;
      const fort = target.communityLife?.border?.defence?.stage || 0;

      // Dragons instinctively defend their home community on their own free will — NO Wizard required!
      if (dragons > 0) {
        const autoDmg = Math.min(240, 85 + dragons * 48 + wizards * 18);
        troll.hp = Math.max(0, troll.hp - autoDmg);
        troll.burnedWeek = week;
        if (troll.hp <= 0) {
          troll.state = 'slain';
          horde.community.totalSlain = (horde.community.totalSlain || 0) + 1;
          const leadName = target.dragonStable.dragons[0]?.name || 'Guardian dragons';
          const slayNote = wizards > 0
            ? target.name + '\'s guardian dragons and wizards incinerated ' + troll.name + ' the Giant Troll during the weekly siege!'
            : leadName + ' and ' + target.name + '\'s autonomous guardian dragons fiercely incinerated ' + troll.name + ' the Giant Troll without needing a rider!';
          record(horde, week, slayNote);
          reports.push({ site: target, text: slayNote });
          continue;
        }
      }

      const mitigation = Math.min(0.75, dragons * 0.28 + soldiers * 0.06 + fort * 0.12);
      const pop = target.population || 0;
      let killedHumans = 0;
      if (pop > 2) {
        const rawCasualties = mitigation >= 0.45 ? 1 : (troll.heightMeters >= 22 ? 2 : 1);
        const floor = target.id === world.activeId ? 1 : 0;
        killedHumans = Math.max(0, Math.min(rawCasualties, pop - floor));
      } else if (pop > 0 && target.id !== world.activeId) {
        killedHumans = 1;
      }

      if (killedHumans > 0) {
        target.population = Math.max(0, pop - killedHumans);
        troll.humansKilled = (troll.humansKilled || 0) + killedHumans;
        horde.community.humansLost = (horde.community.humansLost || 0) + killedHumans;
      }
      // Also smash a community building during weekly siege
      const blds = collectCommunityBuildings(target);
      const dmgMap = ensureDamageMap(target);
      const standing = blds.find(b => !dmgMap[b.id]?.ruined);
      if (standing) {
        const rec = dmgMap[standing.id] || (dmgMap[standing.id] = { id: standing.id, name: standing.name, x: standing.x, y: standing.y, hp: standing.maxHp, maxHp: standing.maxHp, burning: false, ruined: false });
        rec.hp = Math.max(0, rec.hp - 55);
        rec.burning = true;
        if (rec.hp <= 0 && !rec.ruined) {
          rec.ruined = true;
          troll.buildingsSmashed = (troll.buildingsSmashed || 0) + 1;
          horde.community.buildingsRuined = (horde.community.buildingsRuined || 0) + 1;
        }
      }
      if ((target.materials || 0) > 1) target.materials = Math.max(1, target.materials - 1);
      target.wellbeing = clamp((target.wellbeing || 50) - (mitigation >= 0.4 ? 1 : 3), 0, 100);
      troll.state = 'attacking';

      const note = killedHumans > 0
        ? troll.name + ' (' + troll.heightMeters + 'm Giant Troll of ' + COMMUNITY.name + ') smashed through ' + target.name + ', killing ' + killedHumans + ' human Sim' + (killedHumans > 1 ? 's' : '') + '! (' + troll.hp + '/' + troll.maxHp + ' HP)'
        : troll.name + ' (' + troll.heightMeters + 'm Giant Troll) battered buildings in ' + target.name + '! (' + troll.hp + '/' + troll.maxHp + ' HP)';
      record(horde, week, note);
      reports.push({ site: target, text: note });
    }

    const alive = activeTrolls(world);
    const activeSite = byId.get(world.activeId) || communities[0];
    const otherSites = communities.filter(s => s.id !== activeSite?.id && (s.population || 0) > 0);
    const localAlive = alive.filter(t => t.targetSiteId === activeSite?.id);

    // Continually reinforce from 1 km out so Giant Trolls never cease marching on human lands
    if (activeSite && localAlive.length < 2 && (localAlive.length === 0 || week % 2 === 0)) {
      horde.community.wave = (horde.community.wave || 1) + (localAlive.length === 0 ? 1 : 0);
      const fresh = makeTroll(horde, { ...activeSite, _isPlayer: true }, localAlive.length, week, horde.community.wave);
      horde.trolls.push(fresh);
      horde.community.attacksLaunched = (horde.community.attacksLaunched || 0) + 1;
      const arriveNote = 'Darkness stirs 1 km out! A massive ' + fresh.heightMeters + 'm Giant Troll — ' + fresh.name + ' — began marching from ' + COMMUNITY.name + ' toward ' + activeSite.name + '!';
      record(horde, week, arriveNote);
      reports.push({ site: activeSite, text: arriveNote });
    }

    const otherAlive = alive.filter(t => t.targetSiteId !== activeSite?.id);
    if (otherSites.length > 0 && otherAlive.length < Math.min(2, otherSites.length)) {
      const victim = otherSites[(week + horde.serial) % otherSites.length];
      const freshOther = makeTroll(horde, { ...victim, _isPlayer: false }, 2, week, horde.community.wave || 1);
      horde.trolls.push(freshOther);
      horde.community.attacksLaunched = (horde.community.attacksLaunched || 0) + 1;
      const otherNote = COMMUNITY.name + ' dispatched ' + freshOther.name + ' (' + freshOther.heightMeters + 'm Giant Troll) from 1 km out to hunt human Sims in ' + victim.name + '!';
      record(horde, week, otherNote);
      reports.push({ site: victim, text: otherNote });
    }

    const slain = horde.trolls.filter(t => t.state === 'slain');
    if (slain.length > 18) {
      const keepSlain = new Set(slain.slice(-18).map(t => t.id));
      horde.trolls = horde.trolls.filter(t => t.state !== 'slain' || keepSlain.has(t.id));
    }

    return reports;
  }

  function valid(horde) {
    if (horde == null) return true;
    if (typeof horde !== 'object' || Array.isArray(horde)) return false;
    if (!Array.isArray(horde.trolls)) return false;
    return horde.trolls.every(t =>
      t && typeof t.id === 'string' && typeof t.name === 'string' &&
      Number.isFinite(t.hp) && Number.isFinite(t.maxHp) && t.maxHp > 0
    );
  }

  const api = Object.freeze({
    COMMUNITY,
    ARCHETYPES,
    SOURCE_MULTIPLIER,
    STREET_KM,
    SPAWN_DISTANCE_KM,
    distanceKm,
    toWorld3D,
    collectCommunityBuildings,
    buildingDamageSummary,
    repairBuildings,
    ensure,
    activeTrolls,
    trollsForSite,
    summary,
    stepLive,
    attackTroll,
    tick,
    valid
  });

  root.EarthGiantTrolls = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
