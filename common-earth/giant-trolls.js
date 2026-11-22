/* Undead Zombie Horde — Realistic Zombie Outbreak Engine:
   - Waves of 10+ realistic undead zombies shamble out of the dark enchanted woods from game start.
   - Authentic zombie behaviour: drawn relentlessly to EVERYTHING that moves — hunting & biting
     villagers/Sims, lunging at and biting Majestic Wolves, feeding on downed victims, and
     clawing/pounding village houses to reach the people hiding inside.
   - At night, every zombie howls continuously without ever stopping (synced with EarthNightAudio).
   - Preserves window.EarthGiantTrolls API & save compatibility while 100% zombie-themed. */
(function (root) {
  'use strict';

  const STREET_KM = 0.013; // 1 street unit = 13.0 meters
  const TOWN_CENTER_X = 12;
  const TOWN_CENTER_Y = 12;
  const TOWN_PERIMETER_UNITS = 19.5; // Community wall edge (~254m from center)
  // Spawn zombies in the dark outer woods (~125-175m outside territory walls) so they shamble in toward the 100m wolf line!
  const SPAWN_RADIUS_UNITS = 31.0; // ~11.5 units (~150m) beyond the walls!
  const APPROACH_SPEED = 2.05; // Relentless approaching shamble
  const HUNT_SPEED = 3.25; // Frantic rabid lurch/sprint when locking onto living Sims or Wolves
  const ZOMBIE_RADIUS = 0.34;
  const WINDUP_SEC = 0.22;
  const BITE_SEC = 0.22;
  const FEED_SEC = 0.50;
  const RECOVER_SEC = 0.28;
  const MIN_ZOMBIES_PER_WAVE = 10;
  const MAX_CONCURRENT_LOCAL_ZOMBIES = 40;
  const WAVE_INTERVAL_SEC = 55;
  const CLEAR_WAVE_DELAY_SEC = 6;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  const ARCHETYPES = Object.freeze([
    { name: 'Shambler', title: 'Decayed Shambler', skin: '#8d9886', cloth: '#4a4e49', accent: '#6b7566', blood: '#6e1c1a', heightMeters: 1.78, maxHp: 420, armor: 0.36, speedMul: 0.96 },
    { name: 'Biter', title: 'Ravenous Biter', skin: '#959d8d', cloth: '#54463e', accent: '#757d6e', blood: '#821c1c', heightMeters: 1.72, maxHp: 390, armor: 0.32, speedMul: 1.18 },
    { name: 'Stalker', title: 'Forest Stalker', skin: '#7e897b', cloth: '#39423d', accent: '#5d685b', blood: '#731919', heightMeters: 1.84, maxHp: 460, armor: 0.40, speedMul: 1.10 },
    { name: 'Walker', title: 'Bloated Walker', skin: '#9ba18b', cloth: '#4b5059', accent: '#797f6c', blood: '#7b221e', heightMeters: 1.90, maxHp: 580, armor: 0.48, speedMul: 0.84 },
    { name: 'Infected', title: 'Frenzied Infected', skin: '#899282', cloth: '#5c3c3a', accent: '#687161', blood: '#941a1a', heightMeters: 1.74, maxHp: 370, armor: 0.28, speedMul: 1.32 },
    { name: 'Husk', title: 'Hollow Corpse', skin: '#9fa498', cloth: '#3c3e45', accent: '#7e8478', blood: '#661818', heightMeters: 1.81, maxHp: 480, armor: 0.42, speedMul: 0.98 }
  ]);

  const SOURCE_MULTIPLIER = Object.freeze({
    militia: 0.30,
    soldier: 0.38,
    gun: 0.34,
    jet: 0.65,
    wolfBite: 1.55,
    dragonFire: 1.55,
    wizardThunder: 1.55
  });

  function allHumanCommunities(world) {
    if (!world) return [];
    return [
      ...(world.sites || []),
      ...(world.communityLife?.outposts || [])
    ].filter(s => s && s.id);
  }

  function toWorld3D(x, y) {
    return {
      x: Number(((x - TOWN_CENTER_X) * 3.2).toFixed(2)),
      z: Number(((y - TOWN_CENTER_Y) * 3.2).toFixed(2))
    };
  }

  function distanceKm(entity) {
    if (!entity || !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return 0;
    const radial = Math.hypot(entity.x - TOWN_CENTER_X, entity.y - TOWN_CENTER_Y);
    const outsideUnits = Math.max(0, radial - TOWN_PERIMETER_UNITS);
    return Number((outsideUnits * STREET_KM).toFixed(2));
  }

  function collectCommunityBuildings(site) {
    const list = [];
    if (!site) return list;
    const marketBlock = root.EarthShifts?.district?.market || [2, 3];
    const homesBlocks = root.EarthShifts?.district?.homes || [[1, 3], [3, 2], [3, 3]];
    const mCx = marketBlock[0] * 6 + 3;
    const mCy = marketBlock[1] * 6 + 3;
    list.push({
      id: 'market',
      name: 'Village Hall & Market',
      x: mCx,
      y: mCy,
      box: [mCx - 1.55, mCy - 1.45, mCx + 1.55, mCy + 1.45],
      maxHp: 220
    });
    const homeNames = ['West Forest Cottage', 'East Timber Cabin', 'South Woodland Home'];
    homesBlocks.forEach((blk, idx) => {
      const cx = blk[0] * 6 + 3;
      const cy = blk[1] * 6 + 3;
      list.push({
        id: 'home-' + idx,
        name: homeNames[idx] || ('Village Cottage ' + (idx + 1)),
        x: cx,
        y: cy,
        box: [cx - 1.27, cy - 1.125, cx + 1.27, cy + 1.125],
        maxHp: 175
      });
    });
    for (const b of site.buildings || []) {
      const plot = Number.isInteger(b.plot) ? b.plot : 0;
      const cx = (plot % 3) * 6 + 3;
      const cy = Math.floor(plot / 3) * 6 + 3;
      list.push({
        id: b.id || ('lot-' + plot),
        name: b.name || b.kind || 'Village Shelter',
        x: cx,
        y: cy,
        box: [cx - 1.56, cy - 1.42, cx + 1.56, cy + 1.42],
        maxHp: 185
      });
    }
    for (const fb of site.freeBuildings || []) {
      if (!fb || !Number.isFinite(fb.x) || !Number.isFinite(fb.y)) continue;
      list.push({
        id: fb.id || ('fb-' + fb.kind),
        name: fb.name || (fb.kind === 'dragonStable' ? 'Giant Wolf Cave' : fb.kind) || 'Outpost Cabin',
        x: fb.x,
        y: fb.y,
        box: [fb.x - 1.6, fb.y - 1.5, fb.x + 1.6, fb.y + 1.5],
        maxHp: fb.kind === 'dragonStable' ? 320 : 175
      });
    }
    return list;
  }

  function distToBox(px, py, box) {
    if (!box) return Infinity;
    const cx = clamp(px, box[0], box[2]);
    const cy = clamp(py, box[1], box[3]);
    return Math.hypot(px - cx, py - cy);
  }

  function closestPointOnBox(px, py, box) {
    if (!box) return { x: px, y: py };
    return { x: clamp(px, box[0], box[2]), y: clamp(py, box[1], box[3]) };
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

  function makeZombie(horde, targetSite, slotIndex, week, wave) {
    horde.serial = (horde.serial || 0) + 1;
    const arch = ARCHETYPES[(horde.serial - 1) % ARCHETYPES.length];
    const waveScale = 1 + Math.min(1.4, Math.max(0, wave - 1) * 0.14);
    const maxHp = Math.round(arch.maxHp * waveScale);

    // Spawn in the dark outer enchanted forest surrounding the community (y < 14 so coastal sites stay on dry land)
    const approachAngles = [
      -2.72, -2.50, -2.28, -2.06, -1.84, -1.62,
      -1.40, -1.18, -0.96, -0.74, -0.52, -0.34
    ];
    const baseAngle = approachAngles[slotIndex % approachAngles.length];
    const angleJitter = (((horde.serial * 29) % 11) - 5) * 0.025;
    const angle = clamp(baseAngle + angleJitter, -2.82, -0.28);
    const distJitter = (((horde.serial * 17) % 9) - 4) * 1.1;
    const radius = SPAWN_RADIUS_UNITS + distJitter;

    const sx = Number((TOWN_CENTER_X + Math.cos(angle) * radius).toFixed(2));
    const sy = Number((TOWN_CENTER_Y + Math.sin(angle) * radius).toFixed(2));
    const p3 = toWorld3D(sx, sy);

    return {
      id: 'zombie-' + horde.serial,
      species: 'zombie',
      name: arch.name + ' #' + horde.serial,
      title: arch.title,
      skin: arch.skin,
      cloth: arch.cloth,
      accent: arch.accent,
      blood: arch.blood,
      eye: '#c6d69c',
      heightMeters: arch.heightMeters,
      armor: arch.armor,
      speedMul: arch.speedMul,
      hp: maxHp,
      maxHp,
      state: 'approaching', // 'approaching' | 'hunting' | 'attacking' | 'feeding' | 'slain'
      attackPhase: 'march', // 'march' | 'chase' | 'windup' | 'strike' | 'feed' | 'recover'
      attackTimer: 0,
      attackProgress: 0,
      howling: false,
      howlPhase: (horde.serial * 0.9) % (Math.PI * 2),
      targetSiteId: targetSite.id,
      targetSiteName: targetSite.name || 'Forest Village',
      isPlayerTarget: Boolean(targetSite._isPlayer),
      targetKind: null, // 'sim' | 'wolf' | 'building'
      targetId: null,
      targetName: null,
      targetX: TOWN_CENTER_X,
      targetY: TOWN_CENTER_Y,
      facingX: Number((-Math.cos(angle)).toFixed(3)),
      facingY: Number((-Math.sin(angle)).toFixed(3)),
      x: sx,
      y: sy,
      z: 0,
      climbState: null, // null | 'ladder' | 'vaulting'
      stackTier: -1,    // 0..3 when forming the 4-zombie shoulder ladder
      stackCount: 0,
      climbProgress: 0,
      climbedOverWall: false,
      worldX: p3.x,
      worldZ: p3.z,
      distanceKm: distanceKm({ x: sx, y: sy }),
      swingPhase: (horde.serial * 1.3) % (Math.PI * 2),
      stepDustTimer: 0.4 + (slotIndex % 5) * 0.14,
      humansKilled: 0,
      buildingsSmashed: 0,
      strikesLanded: 0,
      wave,
      spawnedWeek: week || 1
    };
  }

  function waveSizeFor(wave) {
    const w = Math.max(1, Math.floor(Number(wave) || 1));
    return Math.max(MIN_ZOMBIES_PER_WAVE, MIN_ZOMBIES_PER_WAVE + Math.min(8, (w - 1) * 2));
  }

  function spawnWave(world, targetSite, opts = {}) {
    if (!world || !targetSite) return { wave: 1, spawned: [], count: 0, message: '' };
    const horde = world.trollHorde;
    if (!horde) return { wave: 1, spawned: [], count: 0, message: '' };

    const communities = allHumanCommunities(world);
    const others = communities.filter(s => s.id !== targetSite.id && (s.population || 0) > 0);
    const week = world.week || 1;
    const wave = opts.wave != null ? Math.max(1, Math.floor(opts.wave)) : ((horde.community.wave || 0) + 1);
    horde.community.wave = wave;
    horde.community.wavesSpawned = (horde.community.wavesSpawned || 0) + 1;
    horde.community.lastWaveWeek = week;

    const count = Math.max(MIN_ZOMBIES_PER_WAVE, Number(opts.count) || waveSizeFor(wave));
    const spawned = [];
    for (let slot = 0; slot < count; slot++) {
      const z = makeZombie(horde, { ...targetSite, _isPlayer: true }, slot, week, wave);
      horde.trolls.push(z);
      spawned.push(z);
    }

    if (others.length) {
      const otherCount = Math.min(others.length, 2);
      for (let i = 0; i < otherCount; i++) {
        const other = others[(wave + i - 1) % others.length];
        if (!other) continue;
        horde.trolls.push(makeZombie(horde, other, count + i, week, wave));
      }
    }

    const msg = 'ZOMBIE WAVE ' + wave + '! ' + count + ' ravenous zombies emerged from the dark woods hunting villagers and wolves around ' + targetSite.name + '!';
    record(horde, week, msg);
    return { wave, spawned, count, message: msg };
  }

  function ensure(world) {
    if (!world) return null;
    const communities = allHumanCommunities(world);
    if (!world.trollHorde) {
      world.trollHorde = {
        community: {
          id: 'undead-horde',
          name: 'Undead Plague Horde',
          origin: 'The Dark Woods',
          hostileToAllHumans: true,
          wave: 0,
          wavesSpawned: 0,
          lastWaveWeek: 0,
          totalSlain: 0,
          humansLost: 0,
          buildingsDamaged: 0,
          buildingsRuined: 0,
          waveElapsedSec: 0,
          clearDelaySec: 0
        },
        serial: 0,
        trolls: [],
        log: []
      };
    }

    const horde = world.trollHorde;
    horde.community ||= {
      id: 'undead-horde',
      name: 'Undead Plague Horde',
      origin: 'The Dark Woods',
      hostileToAllHumans: true,
      wave: 0,
      wavesSpawned: 0,
      lastWaveWeek: 0,
      totalSlain: 0,
      humansLost: 0,
      buildingsDamaged: 0,
      buildingsRuined: 0,
      waveElapsedSec: 0,
      clearDelaySec: 0
    };
    horde.community.name = 'Undead Plague Horde';
    horde.community.origin = 'The Dark Woods';
    horde.trolls ||= [];
    horde.log ||= [];
    if (!Number.isSafeInteger(horde.serial)) horde.serial = horde.trolls.length;

    // Migrate any legacy giant-troll records cleanly to realistic zombies
    for (let i = 0; i < horde.trolls.length; i++) {
      const z = horde.trolls[i];
      if (!z || z.species === 'zombie') continue;
      const arch = ARCHETYPES[i % ARCHETYPES.length];
      z.species = 'zombie';
      z.name = arch.name + ' #' + (i + 1);
      z.title = arch.title;
      z.skin = arch.skin;
      z.cloth = arch.cloth;
      z.accent = arch.accent;
      z.blood = arch.blood;
      z.heightMeters = arch.heightMeters;
      z.speedMul = arch.speedMul;
      z.maxHp = Math.min(z.maxHp || arch.maxHp, arch.maxHp + 180);
      z.hp = Math.min(z.hp || z.maxHp, z.maxHp);
    }

    const playerSite = communities.find(s => s.id === world.activeSiteId) || world.sites?.[0] || communities[0];
    const alive = horde.trolls.filter(t => t && t.state !== 'slain' && t.hp > 0);
    if (playerSite && alive.length === 0) {
      spawnWave(world, playerSite, { wave: Math.max(1, (horde.community.wave || 0) + 1) });
    }
    return horde;
  }

  function record(horde, week, text) {
    if (!horde) return;
    horde.log.unshift({ week: week || 1, text });
    if (horde.log.length > 28) horde.log.length = 28;
  }

  function activeTrolls(world) {
    const horde = world?.trollHorde;
    if (!horde?.trolls?.length) return [];
    return horde.trolls.filter(t => t && t.state !== 'slain' && t.hp > 0);
  }

  function trollsForSite(world, siteId) {
    if (!world || !siteId) return [];
    return activeTrolls(world).filter(t => t.targetSiteId === siteId);
  }

  /**
   * Hyper-Aggressive Authentic Zombie Target Selection:
   * Drawn relentlessly to ALL living life — exposed human villagers/Sims AND roaming Majestic Wolves
   * across a wide 22-unit sight/scent radius, plus village shelters when no living prey is closer.
   */
  function pickTargetForZombie(zombie, site, buildings, sims, wolves) {
    const dmgMap = site?.trollDamage || {};
    let best = null;
    let bestScore = Infinity;

    // 1. Living human villagers / Sims (wide 22-unit scent & sight radius!)
    for (const s of sims || []) {
      if (!s || s.downed || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const d = Math.hypot(s.x - zombie.x, s.y - zombie.y);
      if (d > 22.0) continue;
      const score = d * 0.52;
      if (score < bestScore) {
        bestScore = score;
        best = {
          kind: 'sim',
          id: s.id || s.name || 'villager',
          name: s.name || 'Villager',
          x: s.x,
          y: s.y,
          isPlayer: Boolean(s.isPlayer)
        };
      }
    }

    // 2. Living Majestic Wolves (zombies hyper-aggressively swarm & bite wolves!)
    for (const w of wolves || []) {
      if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) continue;
      if (w.state === 'retreat') continue;
      const d = Math.hypot(w.x - zombie.x, w.y - zombie.y);
      if (d > 20.0) continue;
      const score = d * 0.56;
      if (score < bestScore) {
        bestScore = score;
        best = {
          kind: 'wolf',
          id: w.wolf?.id || w.dragon?.id || w.id,
          name: w.wolf?.name || w.dragon?.name || 'Wolf',
          x: w.x,
          y: w.y
        };
      }
    }

    // 3. Standing village buildings (clawing doors/walls to break inside and devour hiding villagers)
    const standing = (buildings || []).filter(b => !dmgMap[b.id]?.ruined);
    const pool = standing.length ? standing : (buildings || []);
    for (const b of pool) {
      if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
      const d = b.box ? distToBox(zombie.x, zombie.y, b.box) : Math.hypot(b.x - zombie.x, b.y - zombie.y);
      const score = d + 4.5;
      if (score < bestScore) {
        bestScore = score;
        best = {
          kind: 'building',
          id: b.id,
          name: b.name,
          x: b.x,
          y: b.y,
          box: b.box || null,
          maxHp: b.maxHp || 180
        };
      }
    }
    return best;
  }

  function executeZombieBite(world, horde, site, zombie, target, events) {
    const week = world.week || 1;
    zombie.strikesLanded = (zombie.strikesLanded || 0) + 1;

    // Community perimeter walls and fortified gates are 100% INDESTRUCTIBLE to zombies!
    // Zombies cannot put even a single dint in them — they can only enter by climbing atop 3+ other zombies' shoulders.
    if (target.kind === 'wall' || target.kind === 'gate' || target.kind === 'post') {
      return;
    }

    if (target.kind === 'wolf' && root.EarthDragonStable?.damageWolf) {
      const dmg = 42 + ((zombie.strikesLanded * 7) % 21);
      const hit = root.EarthDragonStable.damageWolf(world, site, target.id, dmg, zombie.name);
      if (hit?.ok) {
        zombie.hp = Math.min(zombie.maxHp, zombie.hp + 18);
        events.push({
          type: 'wolfStrike',
          troll: zombie,
          zombie,
          wolfId: target.id,
          wolfName: target.name,
          damage: hit.dealt,
          x: target.x,
          y: target.y,
          message: hit.message
        });
      }
      return;
    }

    if (target.kind === 'sim') {
      if (target.isPlayer) {
        site.wellbeing = clamp((site.wellbeing || 50) - 2, 0, 100);
        const msg = zombie.name + ' lunged and bit you! Retreat behind the wolf pack!';
        record(horde, week, msg);
        events.push({
          type: 'simStrike',
          troll: zombie,
          zombie,
          simId: target.id,
          simName: target.name,
          isPlayer: true,
          x: target.x,
          y: target.y,
          message: msg
        });
      } else {
        zombie.humansKilled = (zombie.humansKilled || 0) + 1;
        zombie.hp = Math.min(zombie.maxHp, zombie.hp + 26); // Zombies feed on bitten villagers
        horde.community.humansLost = (horde.community.humansLost || 0) + 1;
        if ((site.population || 0) > 1) site.population = Math.max(1, site.population - 1);
        site.wellbeing = clamp((site.wellbeing || 50) - 2, 0, 100);
        const msg = zombie.name + ' caught and bit ' + target.name + ' in ' + site.name + '!';
        record(horde, week, msg);
        events.push({
          type: 'simStrike',
          troll: zombie,
          zombie,
          simId: target.id,
          simName: target.name,
          isPlayer: false,
          x: target.x,
          y: target.y,
          message: msg
        });
      }
      return;
    }

    // Clawing & pounding village buildings to reach the people inside
    const map = ensureDamageMap(site);
    const rec = map[target.id] || (map[target.id] = {
      id: target.id,
      name: target.name,
      x: target.x,
      y: target.y,
      hp: target.maxHp || 180,
      maxHp: target.maxHp || 180,
      ruined: false,
      burning: false
    });
    const dmg = 26 + ((zombie.strikesLanded * 7) % 14);
    const wasRuined = Boolean(rec.ruined);
    rec.hp = Math.max(0, rec.hp - dmg);
    rec.burning = rec.hp < rec.maxHp * 0.72;
    horde.community.buildingsDamaged = (horde.community.buildingsDamaged || 0) + 1;
    let justRuined = false;
    if (rec.hp <= 0 && !wasRuined) {
      rec.ruined = true;
      justRuined = true;
      zombie.buildingsSmashed = (zombie.buildingsSmashed || 0) + 1;
      horde.community.buildingsRuined = (horde.community.buildingsRuined || 0) + 1;
      site.materials = Math.max(0, (site.materials || 0) - 2);
      site.wellbeing = clamp((site.wellbeing || 50) - 3, 0, 100);
    }
    const msg = justRuined
      ? zombie.name + ' broke down ' + rec.name + ' in ' + site.name + ' hunting the villagers inside!'
      : zombie.name + ' clawed at ' + rec.name + ' (-' + dmg + ' HP · ' + rec.hp + '/' + rec.maxHp + ' HP)!';
    if (justRuined) record(horde, week, msg);
    events.push({
      type: 'buildingStrike',
      troll: zombie,
      zombie,
      buildingId: rec.id,
      buildingName: rec.name,
      damage: dmg,
      hp: rec.hp,
      maxHp: rec.maxHp,
      justRuined,
      x: rec.x,
      y: rec.y,
      message: msg
    });
  }

  /**
   * Real-Time Live Simulation Step for the Zombie Horde:
   * - Spawns escalating waves of 10+ zombies continuously.
   * - Shambling horde emerges from the dark enchanted woods and relentlessly hunts
   *   moving villagers, roaming Majestic Wolves, and village homes.
   * - Continuously howls throughout the night (isNight === true).
   */
  function stepLive(world, site, dt = 0.016, sceneContext = {}) {
    const events = [];
    if (!world || !site) return events;
    const horde = ensure(world);
    const step = clamp(dt || 0.016, 0.001, 0.25);
    const isNight = Boolean(sceneContext.isNight);

    let local = trollsForSite(world, site.id);
    horde.community.waveElapsedSec = (horde.community.waveElapsedSec || 0) + step;
    if (local.length === 0) {
      horde.community.clearDelaySec = (horde.community.clearDelaySec || 0) + step;
      if (horde.community.clearDelaySec >= CLEAR_WAVE_DELAY_SEC) {
        horde.community.clearDelaySec = 0;
        horde.community.waveElapsedSec = 0;
        const spawnedWave = spawnWave(world, site);
        events.push({ type: 'waveSpawn', wave: spawnedWave.wave, count: spawnedWave.count, message: spawnedWave.message });
        local = trollsForSite(world, site.id);
      }
    } else {
      horde.community.clearDelaySec = 0;
      if (horde.community.waveElapsedSec >= WAVE_INTERVAL_SEC && local.length + MIN_ZOMBIES_PER_WAVE <= MAX_CONCURRENT_LOCAL_ZOMBIES) {
        horde.community.waveElapsedSec = 0;
        const spawnedWave = spawnWave(world, site);
        events.push({ type: 'waveSpawn', wave: spawnedWave.wave, count: spawnedWave.count, message: spawnedWave.message });
        local = trollsForSite(world, site.id);
      }
    }

    if (!local.length) return events;

    const buildings = Array.isArray(sceneContext?.buildings) && sceneContext.buildings.length
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
    const wolves = Array.isArray(sceneContext?.wolves)
      ? sceneContext.wolves
      : (root.EarthDragonStable?.getAutonomousPoses?.(site) || []);

    const FP = root.EarthFlightPhysics;
    let solidSet = FP?.collectSolidObstacles
      ? FP.collectSolidObstacles(site, sceneContext?.solids, { forKind: 'zombie' })
      : { walls: [], buildings: [], all: [] };
    const nightSpeedBoost = isNight ? 1.22 : 1.0;

    const BASE_STACK_MIN = FP?.ZOMBIE_BASE_STACK_MIN || 3; // No less than 3 other zombies forming the vertical shoulder ladder
    const TOTAL_CLIMB_REQUIRED = BASE_STACK_MIN + 1;       // 3 base zombies + 1 climbing zombie = 4 zombies total
    const TIER_H = FP?.ZOMBIE_TIER_HEIGHT || 0.82;
    const DEFAULT_WALL_H = FP?.WALL_HEIGHT || 3.20;
    const VAULT_DURATION_SEC = 5.2; // Difficult, arduous ascent & parapet leap (~8.5s total incl. stack assembly!)

    // Helper: pick the closest solid wall segment (`kind === 'wall'`) on the same side when a zombie
    // hits a gatepost or gets repelled by a magically-shielded gate entrance!
    const nearestClimbableWall = (z, preferredSide = null) => {
      const wallsOnly = solidSet.walls.filter(w => w && w.kind === 'wall' && w.box);
      if (!wallsOnly.length) return null;
      const sameSide = preferredSide ? wallsOnly.filter(w => w.side === preferredSide) : wallsOnly;
      const pool = sameSide.length ? sameSide : wallsOnly;
      let best = null;
      let bestDist = Infinity;
      for (const wOb of pool) {
        const cp = closestPointOnBox(z.x, z.y, wOb.box);
        const d = Math.hypot(cp.x - z.x, cp.y - z.y);
        if (d < bestDist) {
          bestDist = d;
          best = wOb;
        }
      }
      return best;
    };

    const makeWallClimbTarget = (z, wallOb) => {
      const targetWall = (wallOb && wallOb.kind === 'wall')
        ? wallOb
        : nearestClimbableWall(z, wallOb?.side || null);
      if (!targetWall) return null;
      const cp = closestPointOnBox(z.x, z.y, targetWall.box);
      return {
        kind: 'wall',
        id: targetWall.id,
        wallId: targetWall.wallId,
        side: targetWall.side || null,
        outNx: targetWall.outNx || 0,
        outNy: targetWall.outNy || 0,
        h: targetWall.h || DEFAULT_WALL_H,
        name: targetWall.name,
        x: cp.x,
        y: cp.y,
        box: targetWall.box,
        indestructible: true
      };
    };

    const isOutsideWall = (z, wt) => {
      if (!wt || !wt.box) return false;
      const cx = (wt.box[0] + wt.box[2]) * 0.5;
      const cy = (wt.box[1] + wt.box[3]) * 0.5;
      if (wt.outNx) return (z.x - cx) * wt.outNx > 0.05;
      if (wt.outNy) return (z.y - cy) * wt.outNy > 0.05;
      return false;
    };

    // Repel any zombie trying to pass through ANY gate entrance (closed OR open — permanent magical shield!)
    const handleGateShieldRepel = (z, gateOb) => {
      if (!gateOb || gateOb.kind !== 'gate') return;
      const nx = gateOb.outNx || 0;
      const ny = gateOb.outNy || 0;
      // Push cleanly back outside the shielded gate plane
      const pushX = z.x + nx * 0.42;
      const pushY = z.y + ny * 0.42;
      z.x = Number(pushX.toFixed(3));
      z.y = Number(pushY.toFixed(3));
      FP?.triggerGateShieldFlash?.(site, gateOb.wallId || gateOb.id, 1.0);
      z._shieldRepelCooldown = (z._shieldRepelCooldown || 0);
      if (z._shieldRepelCooldown <= 0) {
        z._shieldRepelCooldown = 1.4;
        const gOpen = Boolean(site._gateRuntime?.[gateOb.wallId]?.isOpen);
        const msg = 'GATE SHIELD! ' + z.name + ' was repelled by the protective magical barrier at ' + (gateOb.name || 'the community gate') + '!';
        events.push({
          type: 'gateShieldRepel',
          troll: z,
          zombie: z,
          gateId: gateOb.wallId,
          side: gateOb.side,
          gateOpen: gOpen,
          x: gateOb.cx,
          y: gateOb.cy,
          message: msg
        });
      }
      // Redirect zombie away from the magically-shielded gate toward an outer wall segment to try stacking
      const wallT = makeWallClimbTarget(z, gateOb);
      if (wallT) {
        z._wallTarget = wallT;
        z.state = 'gathering';
        z.attackPhase = 'gather';
        z.attackTimer = 0;
        z.attackProgress = 0;
      }
    };

    // Decay disruption & shield-repel timers
    for (const z of local) {
      if (z._stackDisrupted > 0) z._stackDisrupted = Math.max(0, z._stackDisrupted - step);
      if (z._shieldRepelCooldown > 0) z._shieldRepelCooldown = Math.max(0, z._shieldRepelCooldown - step);
    }

    // ── DIFFICULT 3-OTHER-ZOMBIE SHOULDER-STACK CLIMBING ENGINE ──────────────────
    // Community walls and gates are 100% INDESTRUCTIBLE to zombies (0 damage, 0 dints).
    // Zombies may ONLY get over the walls by climbing on top of and standing on the shoulders
    // of NO LESS THAN 3 OTHER ZOMBIES (3 base ladder zombies + 1 climber = 4 zombies total!).
    // Fewer than 4 zombies -> ZERO climbing; they gather outside and wait for reinforcements.
    const liveById = new Map();
    for (const z of local) liveById.set(z.id, z);

    // 1. Advance climbers currently scrambling up the 3-zombie shoulder stack & leaping over the wall
    const activeVaultWallKeys = new Set();
    const activeBaseLadderIds = new Set();
    for (const z of local) {
      if (z.climbState !== 'vaulting' || !z._climbMeta) continue;
      const m = z._climbMeta;
      // Before the climber leaps over the parapet (progress < 0.74), ALL 3 base ladder zombies MUST
      // remain alive, undisrupted, and holding steady on the outer wall!
      if ((z.climbProgress || 0) < 0.74) {
        const intactBase = (m.baseStackIds || []).filter(id => {
          const bz = liveById.get(id);
          return bz && !(bz._stackDisrupted > 0);
        });
        if (intactBase.length < BASE_STACK_MIN) {
          // Stack collapsed! Climber tumbles back to the ground!
          z.climbState = null;
          z._climbMeta = null;
          z.climbProgress = 0;
          z.climbSlipping = false;
          z.z = 0;
          z.stackTier = -1;
          z.stackCount = 0;
          z.stackStability = 0;
          continue;
        }
        for (const id of intactBase) activeBaseLadderIds.add(id);
      }

      activeVaultWallKeys.add(m.wallKey);
      z.howling = isNight;
      if (isNight) z.howlPhase = ((z.howlPhase || 0) + step * 3.0) % (Math.PI * 2);

      // Authentic difficulty: brief balance slip-back once per climb when stepping onto the 3rd zombie's shoulders!
      if (m.slipTimer > 0) {
        m.slipTimer = Math.max(0, m.slipTimer - step);
        z.climbSlipping = m.slipTimer > 0;
        z.climbProgress = clamp((z.climbProgress || 0) - step * 0.14, 0.18, 1);
      } else {
        z.climbSlipping = false;
        // Slower strain near the top when pulling up onto the 3rd zombie's shoulders & parapet
        const strainMul = (z.climbProgress || 0) > 0.35 && (z.climbProgress || 0) < 0.72 ? 0.82 : 1.0;
        z.climbProgress = clamp((z.climbProgress || 0) + (step * strainMul) / VAULT_DURATION_SEC, 0, 1);
        if (!m.slippedOnce && z.climbProgress >= 0.44 && z.climbProgress < 0.65) {
          m.slippedOnce = true;
          m.slipTimer = 0.48;
          z.climbSlipping = true;
        }
      }

      const p = z.climbProgress;
      const shouldersTopZ = BASE_STACK_MIN * TIER_H; // Standing atop the 3rd zombie's shoulders (~2.46)
      const crestZ = (m.wallH || DEFAULT_WALL_H) + 0.30; // Jumping over the 3.20 tall parapet (~3.50)
      z.stackCount = TOTAL_CLIMB_REQUIRED;
      z.stackTier = BASE_STACK_MIN; // Standing on top of the 3 other zombies!
      z.state = 'climbing';
      z.attackPhase = z.climbSlipping ? 'slip' : 'climb';
      z.facingX = Number((-m.outNx).toFixed(3));
      z.facingY = Number((-m.outNy).toFixed(3));

      if (p < 0.54) {
        // Laboriously climbing up the backs of zombies #1, #2, #3 onto zombie #3's shoulders
        const t = p / 0.54;
        z.x = Number(m.outerX.toFixed(3));
        z.y = Number(m.outerY.toFixed(3));
        z.z = Number((t * shouldersTopZ).toFixed(3));
      } else if (p < 0.74) {
        // Standing atop the 3rd zombie's shoulders and heaving/jumping upward to clear the tall parapet!
        const t = (p - 0.54) / 0.20;
        z.x = Number(m.outerX.toFixed(3));
        z.y = Number(m.outerY.toFixed(3));
        z.z = Number((shouldersTopZ + (crestZ - shouldersTopZ) * t).toFixed(3));
      } else if (p < 0.88) {
        // Leaping horizontally over the stone parapet
        const t = (p - 0.74) / 0.14;
        z.x = Number((m.outerX + (m.innerX - m.outerX) * t).toFixed(3));
        z.y = Number((m.outerY + (m.innerY - m.outerY) * t).toFixed(3));
        z.z = Number(crestZ.toFixed(3));
      } else {
        // Dropping down inside the community walls!
        const t = (p - 0.88) / 0.12;
        z.x = Number(m.innerX.toFixed(3));
        z.y = Number(m.innerY.toFixed(3));
        z.z = Number((crestZ * (1 - t) * (1 - t)).toFixed(3));
      }
      z.swingPhase = ((z.swingPhase || 0) + step * 7.5) % (Math.PI * 2);
      z.distanceKm = distanceKm(z);
      const p3 = toWorld3D(z.x, z.y);
      z.worldX = p3.x;
      z.worldZ = p3.z;

      if (p >= 1) {
        z.x = Number(m.innerX.toFixed(3));
        z.y = Number(m.innerY.toFixed(3));
        z.z = 0;
        z.climbState = null;
        z._climbMeta = null;
        z.climbProgress = 0;
        z.climbSlipping = false;
        z.stackTier = -1;
        z.stackCount = 0;
        z.stackStability = 0;
        z._wallTarget = null;
        z.climbedOverWall = true;
        z.state = 'hunting';
        z.attackPhase = 'chase';
        const climbMsg = 'WALL CLIMBED! ' + z.name + ' stood atop 3 other zombies\' shoulders and jumped over the ' + (m.side || 'perimeter') + ' wall of ' + site.name + '!';
        record(horde, world.week || 1, climbMsg);
        events.push({
          type: 'wallClimb',
          troll: z,
          zombie: z,
          wallId: m.wallId,
          side: m.side,
          baseStackSize: BASE_STACK_MIN,
          stackSize: TOTAL_CLIMB_REQUIRED,
          x: z.x,
          y: z.y,
          message: climbMsg
        });
      }
    }

    // 2. Gather blocked outer-wall zombies per intact wall segment and build difficult 3-zombie base stacks
    const wallCandidates = [];
    for (const z of local) {
      if (z.climbState === 'vaulting') continue;
      if (z._stackDisrupted > 0) {
        // Knocked off balance by wolf bite/attack — collapse back to ground!
        z.climbState = null;
        z.stackTier = -1;
        z.stackCount = 0;
        z.stackStability = 0;
        z.z = 0;
        continue;
      }
      const wt = z._wallTarget;
      if (wt && wt.kind === 'wall' && isOutsideWall(z, wt)) {
        wallCandidates.push(z);
      } else if (z.climbState === 'ladder' || z.climbState === 'gathering') {
        z.climbState = null;
        z.stackTier = -1;
        z.stackCount = 0;
        z.stackStability = 0;
        z.z = 0;
      }
    }

    const clusters = [];
    const assigned = new Set();
    wallCandidates.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (const z of wallCandidates) {
      if (assigned.has(z.id)) continue;
      const group = [z];
      assigned.add(z.id);
      for (const other of wallCandidates) {
        if (assigned.has(other.id)) continue;
        if (other._wallTarget.wallId !== z._wallTarget.wallId) continue;
        // Zombies on the same outer wall segment rally together within 9.0 units to form a climb stack
        if (Math.hypot(other.x - z.x, other.y - z.y) <= 9.0) {
          group.push(other);
          assigned.add(other.id);
        }
      }
      clusters.push(group);
    }

    for (const group of clusters) {
      const lead = group[0];
      const wt = lead._wallTarget;
      const wallBox = wt.box;
      const outNx = wt.outNx || 0;
      const outNy = wt.outNy || 0;
      const horiz = Math.abs(outNy) > 0.5;
      let avgCoord = 0;
      const sampleN = Math.min(group.length, TOTAL_CLIMB_REQUIRED);
      for (let k = 0; k < sampleN; k++) avgCoord += horiz ? group[k].x : group[k].y;
      avgCoord /= Math.max(1, sampleN);
      const anchorAlong = horiz
        ? clamp(avgCoord, wallBox[0] + 0.65, wallBox[2] - 0.65)
        : clamp(avgCoord, wallBox[1] + 0.65, wallBox[3] - 0.65);
      const outerX = horiz ? anchorAlong : (outNx < 0 ? wallBox[0] - ZOMBIE_RADIUS - 0.08 : wallBox[2] + ZOMBIE_RADIUS + 0.08);
      const outerY = horiz ? (outNy < 0 ? wallBox[1] - ZOMBIE_RADIUS - 0.08 : wallBox[3] + ZOMBIE_RADIUS + 0.08) : anchorAlong;
      const innerX = horiz ? anchorAlong : (outNx < 0 ? wallBox[2] + ZOMBIE_RADIUS + 0.58 : wallBox[0] - ZOMBIE_RADIUS - 0.58);
      const innerY = horiz ? (outNy < 0 ? wallBox[3] + ZOMBIE_RADIUS + 0.58 : wallBox[1] - ZOMBIE_RADIUS - 0.58) : anchorAlong;
      const wallKey = wt.wallId + ':' + Math.round(anchorAlong);

      // STRICT RULE: Must have NO LESS THAN 3 OTHER ZOMBIES to stand on (so >= 4 zombies total,
      // OR 3 base zombies actively holding up a vaulting 4th zombie!). Fewer than 4 total -> CANNOT climb!
      const hasActiveVaultOnWall = activeVaultWallKeys.has(wallKey);
      if (group.length < TOTAL_CLIMB_REQUIRED && !(hasActiveVaultOnWall && group.length >= BASE_STACK_MIN)) {
        for (const z of group) {
          z.climbState = 'gathering';
          z.stackTier = -1;
          z.stackCount = group.length;
          z.stackStability = 0;
          z.z = 0;
          z.state = 'gathering';
          z.attackPhase = 'gather';
          z.facingX = Number((-outNx).toFixed(3));
          z.facingY = Number((-outNy).toFixed(3));
          z.howling = isNight;
          if (isNight) z.howlPhase = ((z.howlPhase || 0) + step * 2.6) % (Math.PI * 2);
          // Rally slowly toward the outer wall gathering spot (never damaging the wall!)
          const ddx = outerX - z.x;
          const ddy = outerY - z.y;
          const dd = Math.hypot(ddx, ddy);
          if (dd > 0.32) {
            const mv = Math.min(dd, APPROACH_SPEED * 0.9 * nightSpeedBoost * step);
            z.x = Number((z.x + (ddx / dd) * mv).toFixed(3));
            z.y = Number((z.y + (ddy / dd) * mv).toFixed(3));
            z.swingPhase = ((z.swingPhase || 0) + mv * 2.3) % (Math.PI * 2);
          }
          z.distanceKm = distanceKm(z);
          const p3 = toWorld3D(z.x, z.y);
          z.worldX = p3.x;
          z.worldZ = p3.z;
        }
        continue;
      }

      // 3 base zombies brace one upon another's shoulders (tiers 0, 1, 2 = 3 OTHER zombies!)
      const ladder = group.slice(0, BASE_STACK_MIN);
      let allAlignedAndHoisted = true;
      for (let tier = 0; tier < BASE_STACK_MIN; tier++) {
        const lz = ladder[tier];
        lz.climbState = 'ladder';
        lz.stackTier = tier;
        lz.stackCount = BASE_STACK_MIN;
        lz.state = 'climbing';
        lz.attackPhase = 'stack';
        lz.howling = isNight;
        if (isNight) lz.howlPhase = ((lz.howlPhase || 0) + step * 2.6) % (Math.PI * 2);
        lz.facingX = Number((-outNx).toFixed(3));
        lz.facingY = Number((-outNy).toFixed(3));

        // Pull into tight vertical alignment against the outer stone wall
        const ddx = outerX - lz.x;
        const ddy = outerY - lz.y;
        const dd = Math.hypot(ddx, ddy);
        if (dd > 0.03) {
          const mv = Math.min(dd, 2.8 * step);
          lz.x = Number((lz.x + (ddx / dd) * mv).toFixed(3));
          lz.y = Number((lz.y + (ddy / dd) * mv).toFixed(3));
        }

        // Sequential difficult hoisting: tier 1 waits for tier 0 to brace; tier 2 waits for tier 1!
        const prevReady = tier === 0
          ? true
          : (Math.hypot(outerX - ladder[tier - 1].x, outerY - ladder[tier - 1].y) <= 0.45 && (ladder[tier - 1].z || 0) >= (tier - 1) * TIER_H - 0.08);
        const targetZ = prevReady ? tier * TIER_H : 0;
        const curZ = lz.z || 0;
        const hoistSpeed = tier === 1 ? 1.25 : 1.12;
        if (curZ < targetZ) {
          lz.z = Number(Math.min(targetZ, curZ + step * hoistSpeed).toFixed(3));
        } else {
          lz.z = Number(Math.max(targetZ, curZ - step * 3.0).toFixed(3));
        }
        if (dd > 0.42 || lz.z < tier * TIER_H - 0.08) allAlignedAndHoisted = false;
        lz.distanceKm = distanceKm(lz);
        const p3 = toWorld3D(lz.x, lz.y);
        lz.worldX = p3.x;
        lz.worldZ = p3.z;
      }

      // Stabilization check: even once all 3 base zombies are stacked, balancing takes ~1.8s of unsteady strain!
      const baseAnchor = ladder[0];
      if (allAlignedAndHoisted) {
        baseAnchor.stackStability = clamp((baseAnchor.stackStability || 0) + step * 0.56, 0, 1);
      } else {
        baseAnchor.stackStability = Math.max(0, (baseAnchor.stackStability || 0) - step * 0.7);
      }
      const stability = baseAnchor.stackStability || 0;
      for (const lz of ladder) lz.stackStability = stability;
      const ladderReady = allAlignedAndHoisted && stability >= 0.99;

      // 4th+ zombies climb onto & stand atop the 3 other zombies' shoulders one at a time to jump over!
      const climbers = group.slice(BASE_STACK_MIN);
      for (const cz of climbers) {
        cz.climbState = null;
        cz.stackTier = -1;
        cz.stackCount = BASE_STACK_MIN;
        cz.stackStability = stability;
        cz.z = 0;
        const distToStack = Math.hypot(outerX - cz.x, outerY - cz.y);
        if (ladderReady && distToStack <= 1.35 && !activeVaultWallKeys.has(wallKey)) {
          activeVaultWallKeys.add(wallKey);
          cz.climbState = 'vaulting';
          cz.climbProgress = 0;
          cz.climbSlipping = false;
          cz.stackTier = BASE_STACK_MIN;
          cz.stackCount = TOTAL_CLIMB_REQUIRED;
          cz._climbMeta = {
            wallKey,
            wallId: wt.wallId,
            side: wt.side,
            wallH: wt.h || DEFAULT_WALL_H,
            outNx,
            outNy,
            outerX,
            outerY,
            innerX,
            innerY,
            slippedOnce: false,
            slipTimer: 0,
            baseStackIds: ladder.map(m => m.id)
          };
        } else if (distToStack > 0.45) {
          const mv = Math.min(distToStack, HUNT_SPEED * 0.85 * nightSpeedBoost * step);
          cz.x = Number((cz.x + ((outerX - cz.x) / distToStack) * mv).toFixed(3));
          cz.y = Number((cz.y + ((outerY - cz.y) / distToStack) * mv).toFixed(3));
          cz.swingPhase = ((cz.swingPhase || 0) + mv * 2.4) % (Math.PI * 2);
          cz.climbState = 'queue';
        } else {
          cz.climbState = 'queue';
        }
      }
    }

    const wallBetween = (ax, ay, bx, by) => {
      if (!FP?.segmentIntersectsBox || !solidSet.walls.length) return null;
      for (const wOb of solidSet.walls) {
        if (FP.segmentIntersectsBox(ax, ay, bx, by, wOb.box, 0.08).hit) return wOb;
      }
      return null;
    };

    const moveZombie = (z, destX, destY) => {
      if (!FP?.moveWithSolidCollision || !solidSet.all.length) {
        const moved = Math.hypot(destX - z.x, destY - z.y);
        z.x = Number(destX.toFixed(3));
        z.y = Number(destY.toFixed(3));
        return { x: z.x, y: z.y, moved, hitWall: null, hitBuilding: null };
      }
      const res = FP.moveWithSolidCollision(z.x, z.y, destX, destY, ZOMBIE_RADIUS, solidSet);
      z.x = Number(res.x.toFixed(3));
      z.y = Number(res.y.toFixed(3));
      return res;
    };

    for (let i = 0; i < local.length; i++) {
      const z = local[i];
      // Zombies actively bracing the 3-zombie base ladder, gathering at an outer wall, queued, or climbing over are handled above!
      if (z.climbState === 'ladder' || z.climbState === 'vaulting' || z.climbState === 'queue' || z.climbState === 'gathering') {
        if (z.climbState === 'queue') z.climbState = null;
        // If a living wolf or Sim walks right beside a gathering zombie on the SAME side of the wall, break off to bite it!
        if (z.climbState === 'gathering') {
          const closePrey = pickTargetForZombie(z, site, [], sims, wolves);
          if (closePrey && Math.hypot(closePrey.x - z.x, closePrey.y - z.y) <= 3.6 && !wallBetween(z.x, z.y, closePrey.x, closePrey.y)) {
            z.climbState = null;
            z._wallTarget = null;
          } else {
            continue;
          }
        } else {
          continue;
        }
      }
      z.z = 0;
      z.stackTier = -1;
      z.stackCount = 0;

      const spdMul = (z.speedMul || 1.0) * nightSpeedBoost;

      // Continuous nighttime howling (never stops during night!)
      z.howling = isNight;
      if (isNight) {
        z.howlPhase = ((z.howlPhase || 0) + step * (2.6 + (i % 4) * 0.45)) % (Math.PI * 2);
      }

      const km = distanceKm(z);
      z.distanceKm = km;

      // Check for living Sims or Majestic Wolves within wide scent/sight radius (only clear-LOS prey!)
      const nearbyPrey = pickTargetForZombie(z, site, [], sims, wolves);
      const preyBlockedByWall = nearbyPrey ? wallBetween(z.x, z.y, nearbyPrey.x, nearbyPrey.y) : null;
      const reachablePrey = nearbyPrey && !preyBlockedByWall ? nearbyPrey : null;

      // PHASE 1: Shambling emergence from the outer dark woods toward the village
      if (z.state === 'approaching' && km > 0.025 && !reachablePrey && !z._wallTarget) {
        const entryTarget = nearbyPrey || pickTargetForZombie(z, site, buildings, sims, wolves) || { x: TOWN_CENTER_X, y: TOWN_CENTER_Y, name: site.name, kind: 'building', id: 'market' };
        const dx = entryTarget.x - z.x;
        const dy = entryTarget.y - z.y;
        const dist = Math.hypot(dx, dy) || 1;
        z.facingX = Number((dx / dist).toFixed(3));
        z.facingY = Number((dy / dist).toFixed(3));
        z.targetKind = entryTarget.kind;
        z.targetId = entryTarget.id;
        z.targetName = entryTarget.name;
        z.targetX = entryTarget.x;
        z.targetY = entryTarget.y;
        z.attackPhase = 'march';
        z.attackProgress = 0;

        // Uneven zombie shamble with slight erratic sway — strictly colliding against ALL solid walls, shielded gates & buildings!
        const sway = Math.sin((z.swingPhase || 0) * 1.6) * 0.14;
        const nx = dx / dist;
        const ny = dy / dist;
        const nextX = z.x + (nx - ny * sway) * APPROACH_SPEED * spdMul * step;
        const nextY = z.y + (ny + nx * sway) * APPROACH_SPEED * spdMul * step;
        const mRes = moveZombie(z, nextX, nextY);
        z.swingPhase = ((z.swingPhase || 0) + Math.max(0.01, mRes.moved) * 2.1) % (Math.PI * 2);

        if (mRes.hitWall) {
          if (mRes.hitWall.kind === 'gate') {
            handleGateShieldRepel(z, mRes.hitWall);
          } else {
            // Indestructible wall — NEVER attack/dent it! Gather to climb with 3+ other zombies!
            z._wallTarget = makeWallClimbTarget(z, mRes.hitWall);
            z.state = 'gathering';
            z.attackPhase = 'gather';
            z.attackTimer = 0;
            z.attackProgress = 0;
          }
        }

        z.distanceKm = distanceKm(z);
        const p3 = toWorld3D(z.x, z.y);
        z.worldX = p3.x;
        z.worldZ = p3.z;

        if (!z._wallTarget && z.distanceKm <= 0.025) {
          z.state = 'hunting';
          z.attackPhase = 'chase';
          const breachMsg = 'BREACH! ' + z.name + ' shambled into ' + site.name + ' hunting all living life!';
          record(horde, world.week || 1, breachMsg);
          events.push({ type: 'breach', troll: z, zombie: z, x: z.x, y: z.y, message: breachMsg });
        }
        continue;
      }

      if (z.state === 'approaching' && !reachablePrey && !z._wallTarget) {
        z.state = 'hunting';
        z.attackPhase = 'chase';
      }

      // PHASE 2: Hyper-aggressive hunting, lunging, biting & feeding on living Sims, Majestic Wolves, and interior village shelters!
      // If blocked outside the indestructible perimeter walls, rally to a wall climb spot instead of hitting walls/gates!
      let target = null;
      if (reachablePrey && Math.hypot(reachablePrey.x - z.x, reachablePrey.y - z.y) <= 4.5) {
        target = reachablePrey;
        z._wallTarget = null;
      } else if (z._wallTarget) {
        // Walk toward the assigned outer wall climb segment so it joins the gathering cluster
        const cp = closestPointOnBox(z.x, z.y, z._wallTarget.box);
        z._wallTarget.x = cp.x;
        z._wallTarget.y = cp.y;
        const dWall = Math.hypot(cp.x - z.x, cp.y - z.y);
        if (dWall > 0.75) {
          const mv = Math.min(dWall, APPROACH_SPEED * spdMul * step);
          const mRes = moveZombie(z, z.x + ((cp.x - z.x) / dWall) * mv, z.y + ((cp.y - z.y) / dWall) * mv);
          z.swingPhase = ((z.swingPhase || 0) + Math.max(0.01, mRes.moved) * 2.2) % (Math.PI * 2);
          if (mRes.hitWall?.kind === 'gate') handleGateShieldRepel(z, mRes.hitWall);
        }
        z.state = 'gathering';
        z.attackPhase = 'gather';
        z.distanceKm = distanceKm(z);
        const p3 = toWorld3D(z.x, z.y);
        z.worldX = p3.x;
        z.worldZ = p3.z;
        continue;
      } else {
        target = reachablePrey || nearbyPrey || pickTargetForZombie(z, site, buildings, sims, wolves);
      }
      if (!target) continue;

      z.targetKind = target.kind;
      z.targetId = target.id;
      z.targetName = target.name;
      z.targetX = target.x;
      z.targetY = target.y;

      // Compute exact surface distance for solid buildings so zombies never clip inside solid objects
      const aimPt = target.box ? closestPointOnBox(z.x, z.y, target.box) : { x: target.x, y: target.y };
      const dx = aimPt.x - z.x;
      const dy = aimPt.y - z.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.04) {
        z.facingX = Number((dx / dist).toFixed(3));
        z.facingY = Number((dy / dist).toFixed(3));
      }

      const contactRange = target.kind === 'building' ? 0.95 : 1.75;
      const blockedNow = (target.kind === 'sim' || target.kind === 'wolf' || target.kind === 'building')
        ? wallBetween(z.x, z.y, aimPt.x, aimPt.y)
        : null;

      if (z.attackPhase === 'windup' || z.attackPhase === 'strike' || z.attackPhase === 'feed' || z.attackPhase === 'recover') {
        z.state = z.attackPhase === 'feed' ? 'feeding' : 'attacking';
        if (z.attackPhase === 'windup' && dist > contactRange * 0.75) {
          const lunge = HUNT_SPEED * 0.72 * spdMul * step;
          const mRes = moveZombie(
            z,
            z.x + (dx / Math.max(0.01, dist)) * lunge,
            z.y + (dy / Math.max(0.01, dist)) * lunge
          );
          if (mRes.hitWall) {
            if (mRes.hitWall.kind === 'gate') handleGateShieldRepel(z, mRes.hitWall);
            else z._wallTarget = makeWallClimbTarget(z, mRes.hitWall);
            z.attackPhase = 'gather';
            z.attackTimer = 0;
            z.attackProgress = 0;
          }
        }

        z.attackTimer = (z.attackTimer || 0) + step;
        if (z.attackPhase === 'windup') {
          z.attackProgress = clamp(z.attackTimer / WINDUP_SEC, 0, 1);
          if (z.attackTimer >= WINDUP_SEC) {
            z.attackPhase = 'strike';
            z.attackTimer = 0;
            z.attackProgress = 0;
            const liveAim = target.box ? closestPointOnBox(z.x, z.y, target.box) : { x: target.x, y: target.y };
            const strikeDist = Math.hypot(liveAim.x - z.x, liveAim.y - z.y);
            const biteReach = target.kind === 'building' ? 1.45 : 2.45;
            const strikeWallBlock = wallBetween(z.x, z.y, liveAim.x, liveAim.y);
            if (strikeDist <= biteReach && !strikeWallBlock) {
              executeZombieBite(world, horde, site, z, target, events);
              z._justBitLiving = target.kind === 'sim' || target.kind === 'wolf';
            } else {
              z._justBitLiving = false;
            }
          }
        } else if (z.attackPhase === 'strike') {
          z.attackProgress = clamp(z.attackTimer / BITE_SEC, 0, 1);
          if (z.attackTimer >= BITE_SEC) {
            z.attackPhase = z._justBitLiving ? 'feed' : 'recover';
            z.attackTimer = 0;
            z.attackProgress = 0;
          }
        } else if (z.attackPhase === 'feed') {
          z.attackProgress = clamp(z.attackTimer / FEED_SEC, 0, 1);
          if (z.attackTimer >= FEED_SEC) {
            z.attackPhase = 'recover';
            z.attackTimer = 0;
            z.attackProgress = 0;
          }
        } else if (z.attackPhase === 'recover') {
          z.attackProgress = clamp(z.attackTimer / RECOVER_SEC, 0, 1);
          if (z.attackTimer >= RECOVER_SEC) {
            const nextTarget = pickTargetForZombie(z, site, buildings, sims, wolves);
            const nextAim = nextTarget?.box ? closestPointOnBox(z.x, z.y, nextTarget.box) : nextTarget;
            const nextDist = nextAim ? Math.hypot(nextAim.x - z.x, nextAim.y - z.y) : Infinity;
            const nextRange = nextTarget?.kind === 'building' ? 1.15 : 1.95;
            const nextBlocked = nextAim ? wallBetween(z.x, z.y, nextAim.x, nextAim.y) : null;
            if (nextTarget && nextDist <= nextRange && !nextBlocked) {
              z.attackPhase = 'windup';
              z.attackTimer = 0;
              z.attackProgress = 0;
            } else {
              z.state = 'hunting';
              z.attackPhase = 'chase';
              z.attackTimer = 0;
              z.attackProgress = 0;
            }
          }
        }
      } else if (dist > contactRange || blockedNow) {
        z.state = 'hunting';
        z.attackPhase = 'chase';
        z.attackProgress = 0;
        const stepGoal = Math.min(Math.max(0.1, dist), HUNT_SPEED * spdMul * step);
        const nx = dx / Math.max(0.01, dist);
        const ny = dy / Math.max(0.01, dist);
        const mRes = moveZombie(z, z.x + nx * stepGoal, z.y + ny * stepGoal);
        z.swingPhase = ((z.swingPhase || 0) + Math.max(0.01, mRes.moved) * 2.6) % (Math.PI * 2);

        if (mRes.hitWall) {
          if (mRes.hitWall.kind === 'gate') {
            handleGateShieldRepel(z, mRes.hitWall);
          } else {
            // Indestructible perimeter wall — NEVER attack or dent it! Gather outside to build a 3-zombie shoulder stack!
            z._wallTarget = makeWallClimbTarget(z, mRes.hitWall);
            z.state = 'gathering';
            z.attackPhase = 'gather';
            z.attackTimer = 0;
            z.attackProgress = 0;
          }
        } else if (mRes.hitBuilding && target.kind === 'building' && mRes.hitBuilding.id === target.id) {
          // Reached the exterior wall of an interior village building — claw it!
          z.state = 'attacking';
          z.attackPhase = 'windup';
          z.attackTimer = 0;
          z.attackProgress = 0;
        }
      } else {
        z.state = 'attacking';
        z.attackPhase = 'windup';
        z.attackTimer = 0;
        z.attackProgress = 0;
      }

      z.distanceKm = distanceKm(z);
      const p3 = toWorld3D(z.x, z.y);
      z.worldX = p3.x;
      z.worldZ = p3.z;
    }
    return events;
  }

  function repairBuildings(world, site) {
    if (!world || !site) return { ok: false, message: 'No active community.' };
    const map = site.trollDamage;
    if (!map) return { ok: false, message: 'All village homes in ' + site.name + ' are intact.' };
    const broken = Object.values(map).filter(e => e && (e.ruined || e.hp < e.maxHp));
    if (!broken.length) return { ok: false, message: 'All village homes in ' + site.name + ' are intact.' };

    const matCost = Math.min(site.materials || 0, Math.min(3, broken.length));
    if (matCost > 0) site.materials = Math.max(0, (site.materials || 0) - matCost);
    for (const e of broken) {
      e.hp = e.maxHp;
      e.burning = false;
      e.ruined = false;
    }
    const msg = site.name + ' villagers barricaded and repaired ' + broken.length + ' zombie-damaged building' + (broken.length > 1 ? 's' : '') + (matCost > 0 ? ' (-' + matCost + ' materials).' : '.');
    record(ensure(world), world.week || 1, msg);
    return { ok: true, repaired: broken.length, message: msg };
  }

  function attackTroll(world, site, zombieId, opts = {}) {
    if (!world || !site) return { ok: false, message: 'No active community under attack.' };
    const horde = ensure(world);
    const local = trollsForSite(world, site.id);
    const zombie = zombieId
      ? horde.trolls.find(t => t.id === zombieId && t.state !== 'slain' && t.hp > 0)
      : local[0];
    if (!zombie) {
      return { ok: false, message: 'No active zombie is currently threatening ' + site.name + '.' };
    }

    const source = opts.source || 'militia';
    const mult = SOURCE_MULTIPLIER[source] ?? 0.30;
    const raw = Number.isFinite(opts.damage) ? opts.damage : (
      (source === 'wolfBite' || source === 'dragonFire') ? 92
        : source === 'jet' ? 80
          : 68
    );
    const armor = clamp(Number.isFinite(zombie.armor) ? zombie.armor : 0.36, 0.15, 0.7);
    const armorFactor = (source === 'wolfBite' || source === 'dragonFire')
      ? (1 - armor * 0.16)
      : (1 - armor * 0.42);
    const dealt = Math.max(8, Math.round(raw * mult * armorFactor));
    zombie.hp = Math.max(0, Math.round(zombie.hp - dealt));
    // Striking a zombie that is bracing or climbing a shoulder stack disrupts and collapses the stack!
    if (zombie.climbState === 'ladder' || zombie.climbState === 'vaulting') {
      zombie._stackDisrupted = 1.6;
      zombie.climbState = null;
      zombie._climbMeta = null;
      zombie.climbProgress = 0;
      zombie.climbSlipping = false;
      zombie.z = 0;
      zombie.stackTier = -1;
      zombie.stackStability = 0;
    }

    const killed = zombie.hp <= 0;
    if (killed) {
      zombie.state = 'slain';
      horde.community.totalSlain = (horde.community.totalSlain || 0) + 1;
      site.trust = clamp((site.trust || 50) + 2, 0, 100);
      site.wellbeing = clamp((site.wellbeing || 50) + 2, 0, 100);
      site.funds = (site.funds || 0) + 2;
      const slayer = opts.wolfName || opts.dragonName || opts.attackerName || (site.name + ' villagers');
      const msg = (source === 'wolfBite' || source === 'dragonFire')
        ? slayer + ' tore down ' + zombie.name + ' defending ' + site.name + '! (+2 funds)'
        : slayer + ' put down ' + zombie.name + ' defending ' + site.name + '! (+2 funds)';
      record(horde, world.week || 1, msg);
      return { ok: true, troll: zombie, zombie, dealt, killed: true, hp: 0, maxHp: zombie.maxHp, message: msg };
    }

    const msg = (source === 'wolfBite' || source === 'dragonFire')
      ? (opts.wolfName || opts.dragonName || 'Wolf') + ' savagely bit ' + zombie.name + ' for ' + dealt + ' damage! (' + zombie.hp + '/' + zombie.maxHp + ' HP)'
      : site.name + ' villagers struck ' + zombie.name + ' for ' + dealt + ' damage (' + zombie.hp + '/' + zombie.maxHp + ' HP). Majestic Wolves are far stronger against zombies!';
    record(horde, world.week || 1, msg);
    return { ok: true, troll: zombie, zombie, dealt, killed: false, hp: zombie.hp, maxHp: zombie.maxHp, message: msg };
  }

  function tick(world) {
    if (!world) return [];
    const horde = ensure(world);
    const communities = allHumanCommunities(world);
    if (!communities.length) return [];

    const byId = new Map(communities.map(s => [s.id, s]));
    const reports = [];
    const week = world.week || 1;

    for (const z of activeTrolls(world)) {
      let target = byId.get(z.targetSiteId);
      if (!target || (target.population || 0) <= 0) {
        target = communities.find(s => (s.population || 0) > 1) || communities[0];
        if (target) {
          z.targetSiteId = target.id;
          z.targetSiteName = target.name;
        }
      }
      if (!target) continue;

      const kmNow = distanceKm(z);
      if (z.state === 'approaching' && kmNow > 0.03) {
        const dx = TOWN_CENTER_X - z.x;
        const dy = TOWN_CENTER_Y - z.y;
        const dist = Math.hypot(dx, dy) || 1;
        const stepUnits = Math.min(Math.max(0, dist - (TOWN_PERIMETER_UNITS - 1.5)), 0.14 / STREET_KM);
        z.x = Number((z.x + (dx / dist) * stepUnits).toFixed(2));
        z.y = Number((z.y + (dy / dist) * stepUnits).toFixed(2));
        z.distanceKm = distanceKm(z);
        const p3 = toWorld3D(z.x, z.y);
        z.worldX = p3.x;
        z.worldZ = p3.z;
        if (z.distanceKm > 0.03) continue;
      }

      z.state = 'attacking';
      const loss = target.population > 2 ? 1 : 0;
      if (loss > 0) {
        target.population = Math.max(1, target.population - loss);
        z.humansKilled = (z.humansKilled || 0) + loss;
        horde.community.humansLost = (horde.community.humansLost || 0) + loss;
      }
      target.wellbeing = clamp((target.wellbeing || 50) - 2, 0, 100);
      const note = z.name + ' attacked ' + target.name + (loss ? ' (-' + loss + ' villager)' : '') + '!';
      record(horde, week, note);
      reports.push({ site: target, text: note });
    }

    // Spawn a fresh wave of 10+ zombies every 2 weeks or when local count drops below 5
    const playerSite = communities.find(s => s.id === world.activeSiteId) || world.sites?.[0] || communities[0];
    if (playerSite) {
      const localCount = trollsForSite(world, playerSite.id).length;
      const weeksSinceWave = week - (horde.community.lastWaveWeek || 0);
      if ((localCount < 5 || weeksSinceWave >= 2) && localCount + MIN_ZOMBIES_PER_WAVE <= MAX_CONCURRENT_LOCAL_ZOMBIES) {
        const waveRes = spawnWave(world, playerSite);
        reports.push({ site: playerSite, text: waveRes.message });
      }
    }

    return reports;
  }

  function summary(world, siteId) {
    const horde = world?.trollHorde;
    const alive = activeTrolls(world);
    const local = alive.filter(t => t.targetSiteId === siteId);
    const elsewhere = alive.filter(t => t.targetSiteId !== siteId);
    const approaching = local.filter(t => t.state === 'approaching');
    const attacking = local.filter(t => t.state !== 'approaching');
    const nearestKm = local.length ? Math.min(...local.map(t => distanceKm(t))) : 0;
    const howlingCount = local.filter(t => t.howling).length;
    return {
      communityName: horde?.community?.name || 'Undead Plague Horde',
      wave: horde?.community?.wave || 1,
      totalAlive: alive.length,
      localCount: local.length,
      approachingCount: approaching.length,
      attackingCount: attacking.length,
      howlingCount,
      nearestKm,
      elsewhereCount: elsewhere.length,
      totalSlain: horde?.community?.totalSlain || 0,
      humansLost: horde?.community?.humansLost || 0,
      buildingsRuined: horde?.community?.buildingsRuined || 0,
      local,
      elsewhere,
      log: horde?.log || []
    };
  }

  function valid(horde) {
    if (horde == null) return true;
    if (typeof horde !== 'object' || Array.isArray(horde)) return false;
    if (!horde.community || typeof horde.community.name !== 'string') return false;
    if (!Array.isArray(horde.trolls)) return false;
    return horde.trolls.every(t =>
      t && typeof t.id === 'string' && typeof t.name === 'string' &&
      Number.isFinite(t.hp) && Number.isFinite(t.maxHp) && t.maxHp > 0
    );
  }

  const api = Object.freeze({
    ARCHETYPES,
    SOURCE_MULTIPLIER,
    STREET_KM,
    MIN_TROLLS_PER_WAVE: MIN_ZOMBIES_PER_WAVE,
    MIN_ZOMBIES_PER_WAVE,
    WAVE_INTERVAL_SEC,
    waveSizeFor,
    spawnWave,
    ensure,
    activeTrolls,
    trollsForSite,
    activeZombies: activeTrolls,
    zombiesForSite: trollsForSite,
    distanceKm,
    toWorld3D,
    buildingDamageSummary,
    stepLive,
    repairBuildings,
    attackTroll,
    attackZombie: attackTroll,
    tick,
    summary,
    valid
  });

  root.EarthGiantTrolls = api;
  root.EarthZombies = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
