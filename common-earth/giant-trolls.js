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
  const APPROACH_SPEED = 1.65; // Shamble speed (~21 m/s scaled to game time so they arrive steadily)
  const HUNT_SPEED = 2.45; // Lunge/lurch speed when locking onto moving villagers or wolves
  const WINDUP_SEC = 0.42;
  const BITE_SEC = 0.30;
  const FEED_SEC = 0.78;
  const RECOVER_SEC = 0.45;
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
    const fixed = [
      { id: 'market', name: 'Village Hall & Market', x: 15, y: 15, maxHp: 220 },
      { id: 'home-nw', name: 'North Forest Cottage', x: 9, y: 9, maxHp: 170 },
      { id: 'home-sw', name: 'West Timber Cabin', x: 9, y: 15, maxHp: 170 },
      { id: 'home-ne', name: 'East Woodland Home', x: 15, y: 9, maxHp: 170 }
    ];
    for (const f of fixed) list.push(f);
    for (const b of site.buildings || []) {
      const plot = Number.isInteger(b.plot) ? b.plot : 0;
      list.push({
        id: b.id || ('lot-' + plot),
        name: b.name || b.kind || 'Village Shelter',
        x: (plot % 3) * 6 + 3,
        y: Math.floor(plot / 3) * 6 + 3,
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
        maxHp: fb.kind === 'dragonStable' ? 320 : 175
      });
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
   * Authentic Zombie Target Selection:
   * Drawn relentlessly to ANYTHING moving — exposed human villagers/Sims, roaming Majestic Wolves,
   * and village houses/shelters (to claw inside and eat the villagers)!
   */
  function pickTargetForZombie(zombie, site, buildings, sims, wolves) {
    const dmgMap = site?.trollDamage || {};
    let best = null;
    let bestScore = Infinity;

    // 1. Moving villagers / human Sims (strongest living scent within 12 units!)
    for (const s of sims || []) {
      if (!s || s.downed || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const d = Math.hypot(s.x - zombie.x, s.y - zombie.y);
      if (d > 13.5) continue;
      const score = d * 0.72; // Zombies crave living human flesh above buildings
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

    // 2. Moving Majestic Wolves (zombies lunge & bite wolves too — they try to eat anything moving!)
    for (const w of wolves || []) {
      if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) continue;
      if (w.state === 'retreat') continue;
      const d = Math.hypot(w.x - zombie.x, w.y - zombie.y);
      if (d > 10.5) continue;
      const score = d * 0.78;
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

    // 3. Standing village buildings (zombies claw and pound doors/walls to break in and eat villagers!)
    const standing = (buildings || []).filter(b => !dmgMap[b.id]?.ruined);
    const pool = standing.length ? standing : (buildings || []);
    for (const b of pool) {
      if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
      const d = Math.hypot(b.x - zombie.x, b.y - zombie.y);
      const score = d + 1.8;
      if (score < bestScore) {
        bestScore = score;
        best = {
          kind: 'building',
          id: b.id,
          name: b.name,
          x: b.x,
          y: b.y,
          maxHp: b.maxHp || 180
        };
      }
    }
    return best;
  }

  function executeZombieBite(world, horde, site, zombie, target, events) {
    const week = world.week || 1;
    zombie.strikesLanded = (zombie.strikesLanded || 0) + 1;

    if (target.kind === 'wolf' && root.EarthDragonStable?.damageWolf) {
      const dmg = 18 + ((zombie.strikesLanded * 5) % 12);
      const hit = root.EarthDragonStable.damageWolf(world, site, target.id, dmg, zombie.name);
      if (hit?.ok) {
        zombie.hp = Math.min(zombie.maxHp, zombie.hp + 14);
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

    const nightSpeedBoost = isNight ? 1.18 : 1.0;

    for (let i = 0; i < local.length; i++) {
      const z = local[i];
      const spdMul = (z.speedMul || 1.0) * nightSpeedBoost;

      // Continuous nighttime howling (never stops during night!)
      z.howling = isNight;
      if (isNight) {
        z.howlPhase = ((z.howlPhase || 0) + step * (2.6 + (i % 4) * 0.45)) % (Math.PI * 2);
      }

      const km = distanceKm(z);
      z.distanceKm = km;

      // Check if a roaming Majestic Wolf or exposed villager is already right next to an approaching zombie!
      const nearbyPrey = pickTargetForZombie(z, site, [], sims, wolves);

      // PHASE 1: Shambling emergence from the outer dark enchanted forest toward the village
      if (z.state === 'approaching' && km > 0.025 && !nearbyPrey) {
        const entryTarget = pickTargetForZombie(z, site, buildings, sims, wolves) || { x: TOWN_CENTER_X, y: TOWN_CENTER_Y, name: site.name, kind: 'building', id: 'market' };
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

        // Uneven zombie shamble with slight erratic sway
        const sway = Math.sin((z.swingPhase || 0) * 1.6) * 0.14;
        const nx = dx / dist;
        const ny = dy / dist;
        z.x = Number((z.x + (nx - ny * sway) * APPROACH_SPEED * spdMul * step).toFixed(3));
        z.y = Number((z.y + (ny + nx * sway) * APPROACH_SPEED * spdMul * step).toFixed(3));
        z.swingPhase = ((z.swingPhase || 0) + step * 3.4 * spdMul) % (Math.PI * 2);

        z.distanceKm = distanceKm(z);
        const p3 = toWorld3D(z.x, z.y);
        z.worldX = p3.x;
        z.worldZ = p3.z;

        if (z.distanceKm <= 0.025) {
          z.state = 'hunting';
          z.attackPhase = 'chase';
          const breachMsg = 'BREACH! ' + z.name + ' shambled into ' + site.name + ' hunting villagers!';
          record(horde, world.week || 1, breachMsg);
          events.push({ type: 'breach', troll: z, zombie: z, x: z.x, y: z.y, message: breachMsg });
        }
        continue;
      }

      if (z.state === 'approaching' && !nearbyPrey) {
        z.state = 'hunting';
        z.attackPhase = 'chase';
      }

      // PHASE 2: Relentless hunting, lunging, biting & feeding on villagers, wolves, and shelters!
      const target = nearbyPrey || pickTargetForZombie(z, site, buildings, sims, wolves);
      if (!target) continue;

      z.targetKind = target.kind;
      z.targetId = target.id;
      z.targetName = target.name;
      z.targetX = target.x;
      z.targetY = target.y;

      const dx = target.x - z.x;
      const dy = target.y - z.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        z.facingX = Number((dx / dist).toFixed(3));
        z.facingY = Number((dy / dist).toFixed(3));
      }

      const contactRange = target.kind === 'building' ? 2.1 : 1.45;

      if (z.attackPhase === 'windup' || z.attackPhase === 'strike' || z.attackPhase === 'feed' || z.attackPhase === 'recover') {
        z.state = z.attackPhase === 'feed' ? 'feeding' : 'attacking';
        if (z.attackPhase === 'windup' && dist > contactRange * 0.8) {
          const lunge = HUNT_SPEED * 0.65 * spdMul * step;
          z.x = Number((z.x + (dx / Math.max(0.01, dist)) * lunge).toFixed(3));
          z.y = Number((z.y + (dy / Math.max(0.01, dist)) * lunge).toFixed(3));
        }

        z.attackTimer = (z.attackTimer || 0) + step;
        if (z.attackPhase === 'windup') {
          z.attackProgress = clamp(z.attackTimer / WINDUP_SEC, 0, 1);
          if (z.attackTimer >= WINDUP_SEC) {
            z.attackPhase = 'strike';
            z.attackTimer = 0;
            z.attackProgress = 0;
            const biteReach = target.kind === 'building' ? 2.8 : 2.35;
            if (dist <= biteReach) {
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
          // Brief hunched feeding frenzy after biting a villager/wolf
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
            const nextDist = nextTarget ? Math.hypot(nextTarget.x - z.x, nextTarget.y - z.y) : Infinity;
            const nextRange = nextTarget?.kind === 'building' ? 2.1 : 1.45;
            if (nextTarget && nextDist <= nextRange + 0.4) {
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
      } else if (dist > contactRange) {
        z.state = 'hunting';
        z.attackPhase = 'chase';
        z.attackProgress = 0;
        const moveDist = Math.min(dist - contactRange * 0.65, HUNT_SPEED * spdMul * step);
        if (moveDist > 0) {
          z.x = Number((z.x + (dx / dist) * moveDist).toFixed(3));
          z.y = Number((z.y + (dy / dist) * moveDist).toFixed(3));
        }
        z.swingPhase = ((z.swingPhase || 0) + step * 4.6 * spdMul) % (Math.PI * 2);
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
