/* Giant Wolf Cave & Majestic Wolf Pack:
   Enchanted forest guardian wolves that roam freely inside the community and up to
   maximally 100 meters (no more, no less) outside the community's territory.
   They protect villagers relentlessly against Zombies and howl together at the Full Moon
   every night. Zero dragons, zero wizards — pure Majestic Wolves. */
(function (root) {
  'use strict';

  const METERS_PER_UNIT = 13;
  const MAX_OUTSIDE_METERS = 100;
  const MAX_OUTSIDE_UNITS = MAX_OUTSIDE_METERS / METERS_PER_UNIT;

  const LINEAGES = Object.freeze([
    { id: 'silver', title: 'Silver Timber Wolf', fur: '#cfd8e2', accent: '#f2f7ff', mane: '#7c8b9c', aura: '#b8dcff', eye: '#ffd452', scale: '#cfd8e2', wing: '#7c8b9c', fire: '#b8dcff', speedBonus: 1.08 },
    { id: 'frost', title: 'Arctic Moon Wolf', fur: '#e6eff8', accent: '#ffffff', mane: '#9ab4cc', aura: '#9ee8ff', eye: '#7ee6ff', scale: '#e6eff8', wing: '#9ab4cc', fire: '#9ee8ff', speedBonus: 1.12 },
    { id: 'shadow', title: 'Obsidian Night Wolf', fur: '#343c48', accent: '#9ab0c9', mane: '#1c2129', aura: '#9ab8f2', eye: '#ffbe42', scale: '#343c48', wing: '#1c2129', fire: '#9ab8f2', speedBonus: 1.10 },
    { id: 'amber', title: 'Golden Forest Wolf', fur: '#c89250', accent: '#f6dfba', mane: '#7d532b', aura: '#ffda82', eye: '#ffe470', scale: '#c89250', wing: '#7d532b', fire: '#ffda82', speedBonus: 1.06 },
    { id: 'moss', title: 'Emerald Dire Wolf', fur: '#597a68', accent: '#bae8cc', mane: '#324d41', aura: '#84f0b8', eye: '#d6ff75', scale: '#597a68', wing: '#324d41', fire: '#84f0b8', speedBonus: 1.05 }
  ]);

  const WOLF_NAMES = ['Fenrir', 'Luna', 'Silverfang', 'Shadowpelt', 'Timber', 'Ashwind', 'Freya', 'Stormclaw', 'Frostmane', 'Mossback'];

  const LARDER_MAX = 36;
  const WOLF_COST = Object.freeze({ funds: 6, food: 3 });
  const DRAGON_COST = WOLF_COST;
  const FEED_FOOD_COST = 1;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function hasStable(site) {
    if (!site) return false;
    return Boolean(
      site.dragonStable?.built ||
      site.buildings?.some(b => b.kind === 'dragonStable') ||
      site.freeBuildings?.some(b => b.kind === 'dragonStable')
    );
  }

  function stableLocation(site) {
    if (!site) return null;
    const free = site.freeBuildings?.find(b => b.kind === 'dragonStable');
    if (free) return { x: free.x, y: free.y, free: true, id: free.id };
    const lot = site.buildings?.find(b => b.kind === 'dragonStable');
    if (lot) return { x: (lot.plot % 3) * 6 + 3, y: Math.floor(lot.plot / 3) * 6 + 3, plot: lot.plot, id: lot.id };
    if (site.dragonStable?.x != null && site.dragonStable?.y != null) {
      return { x: site.dragonStable.x, y: site.dragonStable.y, free: true, id: 'dragon-stable' };
    }
    return null;
  }

  function territoryParams(site) {
    const lvl = site?.territoryLevel || 0;
    const hasWater = Boolean(site?.water || site?.coastal || root.CommonEarthSim?.waterfront?.(site));
    return { lvl, hasWater };
  }

  function wolfBoundsForSite(site) {
    const { lvl, hasWater } = territoryParams(site);
    if (root.EarthFlightPhysics?.wolfTerritoryBounds2D) {
      return root.EarthFlightPhysics.wolfTerritoryBounds2D(lvl, hasWater);
    }
    const expand = Math.max(0, Math.floor(Number(lvl) || 0)) * 6;
    const tMinX = -7.5 - expand;
    const tMaxX = 27.5 + expand;
    const tMinY = -7.5 - expand;
    const tMaxY = hasWater ? 25.15 : 27.5 + expand;
    return {
      minX: tMinX - MAX_OUTSIDE_UNITS,
      maxX: tMaxX + MAX_OUTSIDE_UNITS,
      minY: tMinY - MAX_OUTSIDE_UNITS,
      maxY: hasWater ? tMaxY : tMaxY + MAX_OUTSIDE_UNITS,
      territoryMinX: tMinX,
      territoryMaxX: tMaxX,
      territoryMinY: tMinY,
      territoryMaxY: tMaxY,
      maxOutsideMeters: MAX_OUTSIDE_METERS,
      maxOutsideUnits: MAX_OUTSIDE_UNITS,
      metersPerUnit: METERS_PER_UNIT,
      hasWaterfront: hasWater
    };
  }

  function distanceOutsideTerritoryMeters(site, x, y) {
    const { lvl, hasWater } = territoryParams(site);
    if (root.EarthFlightPhysics?.distanceOutsideTerritoryMeters) {
      return root.EarthFlightPhysics.distanceOutsideTerritoryMeters(x, y, lvl, hasWater);
    }
    const wb = wolfBoundsForSite(site);
    const cx = clamp(x, wb.territoryMinX, wb.territoryMaxX);
    const cy = clamp(y, wb.territoryMinY, wb.territoryMaxY);
    return Math.hypot(x - cx, y - cy) * METERS_PER_UNIT;
  }

  function clampWolfPosition(site, x, y) {
    const { lvl, hasWater } = territoryParams(site);
    if (root.EarthFlightPhysics?.clampPointToWolfTerritory2D) {
      return root.EarthFlightPhysics.clampPointToWolfTerritory2D(x, y, lvl, hasWater);
    }
    const wb = wolfBoundsForSite(site);
    let px = Number.isFinite(x) ? x : 12;
    let py = Number.isFinite(y) ? y : 12;
    let clamped = false;
    if (wb.hasWaterfront && py > wb.territoryMaxY) {
      py = wb.territoryMaxY;
      clamped = true;
    }
    const cx = clamp(px, wb.territoryMinX, wb.territoryMaxX);
    const cy = clamp(py, wb.territoryMinY, wb.territoryMaxY);
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_OUTSIDE_UNITS) {
      const s = MAX_OUTSIDE_UNITS / dist;
      px = cx + dx * s;
      py = cy + dy * s;
      clamped = true;
    }
    return {
      x: px,
      y: py,
      clamped,
      outsideMeters: Math.min(MAX_OUTSIDE_METERS, Math.hypot(px - cx, py - cy) * METERS_PER_UNIT),
      bounds: wb
    };
  }

  function ensure(site) {
    if (!site) return null;
    if (!site.dragonStable) {
      site.dragonStable = {
        built: hasStable(site),
        foodStock: 14,
        workers: [],
        wizards: [], // Kept empty for save schema compatibility — zero wizards!
        dragons: [], // Stores Majestic Wolves pack records
        serial: 0,
        funBlasts: 0,
        attacks: 0,
        scorched: [],
        log: []
      };
    }
    const ds = site.dragonStable;
    if (hasStable(site)) ds.built = true;
    ds.workers ||= [];
    ds.wizards = []; // No wizards in the Enchanted Forest wolf sanctuary
    ds.dragons ||= [];
    ds.scorched ||= [];
    ds.log ||= [];
    if (!Number.isFinite(ds.foodStock)) ds.foodStock = 14;
    if (!Number.isSafeInteger(ds.serial)) ds.serial = ds.dragons.length;
    // Normalize wolf fields on loaded records
    for (let i = 0; i < ds.dragons.length; i++) {
      const w = ds.dragons[i];
      if (!w) continue;
      w.species = 'wolf';
      const lin = LINEAGES.find(l => l.id === w.lineage) || LINEAGES[i % LINEAGES.length];
      if (!LINEAGES.some(l => l.id === w.lineage)) {
        w.lineage = lin.id;
        w.lineageTitle = lin.title;
        w.fur = lin.fur;
        w.mane = lin.mane;
        w.accent = lin.accent;
        w.aura = lin.aura;
        w.eye = lin.eye;
        w.scale = lin.fur;
        w.wing = lin.mane;
      }
      if (!Number.isFinite(w.maxHp)) w.maxHp = 280;
      if (!Number.isFinite(w.hp)) w.hp = w.maxHp;
      if (!Number.isFinite(w.hunger)) w.hunger = 100;
    }
    return ds;
  }

  /**
   * Seeds 2 starter Majestic Wolves when a community's starting Giant Wolf Cave is founded
   * so the Enchanted Forest is immediately guarded by roaming wolves.
   */
  function ensureStarterPack(site, week = 1) {
    if (!site) return [];
    const ds = ensure(site);
    if (!ds || ds.dragons.length > 0 || ds.starterSeeded) return ds?.dragons || [];
    ds.starterSeeded = true;
    const starters = [
      { lineage: LINEAGES[0], name: 'Fenrir' },
      { lineage: LINEAGES[1], name: 'Luna' }
    ];
    for (const s of starters) {
      ds.serial++;
      ds.dragons.push({
        id: 'wolf-' + ds.serial,
        species: 'wolf',
        name: s.name,
        lineage: s.lineage.id,
        lineageTitle: s.lineage.title,
        homeSiteId: site.id,
        homeSiteName: site.name,
        fur: s.lineage.fur,
        accent: s.lineage.accent,
        mane: s.lineage.mane,
        aura: s.lineage.aura,
        eye: s.lineage.eye,
        scale: s.lineage.fur,
        wing: s.lineage.mane,
        fire: s.lineage.aura,
        hp: 280,
        maxHp: 280,
        hunger: 100,
        blasts: 0,
        autonomousKills: 0,
        howls: 0,
        raisedWeek: week || 1
      });
    }
    ds.log.unshift({
      week: week || 1,
      text: 'Fenrir and Luna emerged from ' + site.name + '\'s Giant Wolf Cave to roam the enchanted forest and guard the village up to 100m beyond its borders.'
    });
    return ds.dragons;
  }

  function record(site, world, text) {
    const ds = ensure(site);
    if (!ds) return;
    ds.log.unshift({ week: world?.week || 1, text });
    if (ds.log.length > 24) ds.log.length = 24;
    if (world && root.EarthCommunityLife?.recordWeek) {
      root.EarthCommunityLife.recordWeek(site, world.week, text);
    }
  }

  function summonDragon(world, site, lineageId, customName) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Giant Wolf Cave before calling new wolves.' };
    const ds = ensure(site);
    if ((site.funds || 0) < WOLF_COST.funds || (site.food || 0) < WOLF_COST.food) {
      return {
        ok: false,
        message: 'Calling a Majestic Wolf to the pack requires ' + WOLF_COST.funds + ' funds and ' + WOLF_COST.food + ' food.'
      };
    }
    site.funds -= WOLF_COST.funds;
    site.food -= WOLF_COST.food;
    ds.serial++;
    const lineage = LINEAGES.find(l => l.id === lineageId) || LINEAGES[ds.dragons.length % LINEAGES.length];
    const usedNames = new Set(ds.dragons.map(w => w.name));
    const fallbackBase = WOLF_NAMES.find(n => !usedNames.has(n)) || (WOLF_NAMES[ds.dragons.length % WOLF_NAMES.length] + ' ' + (ds.dragons.length + 1));
    const name = (customName && String(customName).trim().slice(0, 36)) || fallbackBase;
    const wolf = {
      id: 'wolf-' + ds.serial,
      species: 'wolf',
      name,
      lineage: lineage.id,
      lineageTitle: lineage.title,
      homeSiteId: site.id,
      homeSiteName: site.name,
      fur: lineage.fur,
      accent: lineage.accent,
      mane: lineage.mane,
      aura: lineage.aura,
      eye: lineage.eye,
      scale: lineage.fur,
      wing: lineage.mane,
      fire: lineage.aura,
      hp: 280,
      maxHp: 280,
      hunger: 100,
      blasts: 0,
      autonomousKills: 0,
      howls: 0,
      raisedWeek: world?.week || 1
    };
    ds.dragons.push(wolf);
    const msg = name + ' (' + lineage.title + ') joined ' + site.name + '\'s pack at the Giant Wolf Cave, roaming the enchanted forest to hunt zombies up to 100m outside the territory.';
    record(site, world, msg);
    return { ok: true, wolf, dragon: wolf, message: msg };
  }

  function assignWorker(world, site, workerId, workerName) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Giant Wolf Cave first.' };
    const ds = ensure(site);
    if (!workerId) return { ok: false, message: 'Choose a villager to tend the Giant Wolf Cave.' };
    const existing = ds.workers.find(w => w.id === workerId);
    if (existing) {
      ds.workers = ds.workers.filter(w => w.id !== workerId);
      const msg = existing.name + ' stepped down from Wolf Cave keeper duties.';
      record(site, world, msg);
      return { ok: true, assigned: false, message: msg };
    }
    const persona = root.EarthPersonas?.profile?.(site, workerId) || root.EarthAgency?.identity?.(site, workerId);
    const name = workerName || persona?.name || workerId;
    ds.workers.push({ id: workerId, name, sinceWeek: world?.week || 1, mealsReplenished: 0 });
    const msg = name + ' now tends the Giant Wolf Cave, replenishing provisions and feeding the wolf pack.';
    record(site, world, msg);
    return { ok: true, assigned: true, message: msg };
  }

  function replenishLarder(world, site, amount = 6) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Giant Wolf Cave first.' };
    const ds = ensure(site);
    const space = Math.max(0, LARDER_MAX - ds.foodStock);
    if (space <= 0) return { ok: false, message: 'The Wolf Cave provisions are already full.' };
    const take = Math.min(space, Math.max(1, Math.floor(amount)), site.food || 0);
    if (take <= 0) return { ok: false, message: 'No village food available to stock the Wolf Cave.' };
    site.food -= take;
    ds.foodStock = Math.min(LARDER_MAX, ds.foodStock + take);
    const msg = 'Stocked the Giant Wolf Cave with +' + take + ' fresh rations (' + ds.foodStock + '/' + LARDER_MAX + ').';
    record(site, world, msg);
    return { ok: true, added: take, foodStock: ds.foodStock, message: msg };
  }

  function feedDragon(world, site, wolfId, byWorker = '') {
    if (!hasStable(site)) return { ok: false, message: 'Build a Giant Wolf Cave first.' };
    const ds = ensure(site);
    const wolf = ds.dragons.find(d => d.id === wolfId);
    if (!wolf) return { ok: false, message: 'Wolf not found.' };
    if (wolf.hunger >= 98 && (wolf.hp ?? 280) >= (wolf.maxHp ?? 280)) {
      return { ok: false, message: wolf.name + ' is already well fed and at full strength.' };
    }
    if (ds.foodStock < FEED_FOOD_COST) {
      if ((site.food || 0) >= FEED_FOOD_COST) {
        site.food -= FEED_FOOD_COST;
        ds.foodStock += FEED_FOOD_COST;
      } else {
        return { ok: false, message: 'The Wolf Cave food cache is empty. Assign cave keepers or replenish food.' };
      }
    }
    ds.foodStock = Math.max(0, ds.foodStock - FEED_FOOD_COST);
    const before = wolf.hunger;
    wolf.hunger = clamp(wolf.hunger + 38, 0, 100);
    wolf.hp = clamp((wolf.hp ?? 280) + 95, 1, wolf.maxHp || 280);
    const msg = (byWorker ? byWorker + ' fed ' : 'Fed ') + wolf.name + ' (' + Math.round(before) + '% → ' + Math.round(wolf.hunger) + '% nourished · ' + Math.round(wolf.hp) + '/' + (wolf.maxHp || 280) + ' HP).';
    record(site, world, msg);
    return { ok: true, wolf, dragon: wolf, foodStock: ds.foodStock, message: msg };
  }

  function damageWolf(world, site, wolfId, amount, attackerName = 'Zombie') {
    const ds = ensure(site);
    if (!ds) return { ok: false, dealt: 0, retreated: false };
    const wolf = ds.dragons.find(w => w.id === wolfId);
    if (!wolf) return { ok: false, dealt: 0, retreated: false };
    const dmg = Math.max(1, Math.round(Number(amount) || 14));
    wolf.hp = Math.max(0, Math.round((wolf.hp ?? wolf.maxHp ?? 280) - dmg));
    let retreated = false;
    if (wolf.hp <= 0) {
      // Severely wounded wolf sprints back to the Giant Wolf Cave to recover its strength
      retreated = true;
      wolf.hp = Math.round((wolf.maxHp || 280) * 0.25);
      const map = getRuntimeMap(site);
      const st = map.get(wolf.id);
      const cave = stableLocation(site) || { x: -4.8, y: 6.2 };
      const denFront = { x: cave.x, y: cave.y + 2.45 };
      if (st) {
        st.recoverTimer = 6.5;
        st.state = 'retreat';
        st.targetId = null;
        // Wolf sprints back to the clear mossy den mouth instead of teleporting through walls
        st.retreatGoal = denFront;
      }
      const msg = attackerName + ' bit ' + wolf.name + ' badly! ' + wolf.name + ' retreated to the Giant Wolf Cave to mend its wounds.';
      record(site, world, msg);
      return { ok: true, dealt: dmg, hp: wolf.hp, retreated: true, message: msg };
    }
    return {
      ok: true,
      dealt: dmg,
      hp: wolf.hp,
      retreated: false,
      message: attackerName + ' lunged and bit ' + wolf.name + ' (-' + dmg + ' HP · ' + wolf.hp + '/' + (wolf.maxHp || 280) + ' HP)!'
    };
  }

  function packHowl(world, site, wolfId) {
    if (!hasStable(site)) return { ok: false, message: 'No Giant Wolf Cave found.' };
    const ds = ensure(site);
    if (!ds.dragons.length) return { ok: false, message: 'Call a Majestic Wolf at the Giant Wolf Cave first.' };
    const map = getRuntimeMap(site);
    const chosen = wolfId ? ds.dragons.filter(w => w.id === wolfId) : ds.dragons;
    for (const w of chosen) {
      w.howls = (w.howls || 0) + 1;
      const st = map.get(w.id);
      if (st) {
        st.howlTimer = 4.2;
        st.state = 'howling';
      }
    }
    if (root.EarthNightAudio?.triggerWolfHowl) {
      root.EarthNightAudio.unlock?.();
      chosen.slice(0, 3).forEach((_, idx) => root.EarthNightAudio.triggerWolfHowl(idx * 0.45, [1.0, 1.16, 0.88][idx]));
    }
    site.wellbeing = clamp((site.wellbeing || 50) + 1, 0, 100);
    const names = chosen.map(w => w.name).join(', ');
    const msg = names + ' raised their heads and howled together through the enchanted forest of ' + site.name + '!';
    record(site, world, msg);
    return { ok: true, message: msg };
  }

  function tick(world, site, dtWeeks = 1) {
    if (!hasStable(site)) return [];
    const ds = ensure(site);
    const notes = [];

    for (const w of ds.dragons) {
      w.hunger = clamp(w.hunger - Math.round(14 * dtWeeks), 0, 100);
      w.hp = clamp((w.hp ?? 280) + Math.round(45 * dtWeeks), 1, w.maxHp || 280);
    }

    if (ds.workers.length > 0) {
      const targetStock = Math.min(LARDER_MAX, 8 + ds.dragons.length * 4);
      let replenishedTotal = 0;
      for (const keeper of ds.workers) {
        if (ds.foodStock < targetStock) {
          const needed = Math.min(4, targetStock - ds.foodStock);
          const fromStores = Math.min(needed, Math.max(0, (site.food || 0) - 2));
          const foraged = needed - fromStores > 0 ? Math.min(2, needed - fromStores) : 0;
          site.food = Math.max(0, (site.food || 0) - fromStores);
          const added = fromStores + foraged;
          ds.foodStock = Math.min(LARDER_MAX, ds.foodStock + added);
          keeper.mealsReplenished = (keeper.mealsReplenished || 0) + added;
          replenishedTotal += added;
        }
      }
      if (replenishedTotal > 0) {
        const keeperNames = ds.workers.map(w => w.name).join(' and ');
        const note = keeperNames + ' stocked the Giant Wolf Cave with ' + replenishedTotal + ' fresh forest provisions.';
        notes.push(note);
        record(site, world, note);
      }

      for (const w of ds.dragons) {
        if ((w.hunger < 70 || (w.hp ?? 280) < (w.maxHp || 280) * 0.75) && ds.foodStock >= FEED_FOOD_COST) {
          const keeper = ds.workers[0];
          const res = feedDragon(world, site, w.id, keeper.name);
          if (res.ok) notes.push(res.message);
        }
      }
    }

    const autoDefense = autonomousDefend(world, site, { dtWeeks });
    for (const note of autoDefense.messages) notes.push(note);

    return notes;
  }

  // Runtime autonomous pack roaming, hunting & Full Moon howling state (WeakMap keeps save JSON clean)
  const runtimeState = new WeakMap();

  function getRuntimeMap(site) {
    if (!site) return new Map();
    let map = runtimeState.get(site);
    if (!map) {
      map = new Map();
      runtimeState.set(site, map);
    }
    return map;
  }

  /**
   * Scans ALL active threats encroaching on or within the wolves' 100-meter outer perimeter.
   */
  function findHomelandThreats(world, site, sceneContext = {}) {
    if (!site) return [];
    const threats = [];

    // 1. Zombies approaching or invading the enchanted forest community
    const localZombies = (world && root.EarthGiantTrolls?.trollsForSite)
      ? root.EarthGiantTrolls.trollsForSite(world, site.id)
      : [];
    for (const z of localZombies) {
      if (!z || z.state === 'slain' || z.hp <= 0) continue;
      const outM = distanceOutsideTerritoryMeters(site, z.x, z.y);
      threats.push({
        id: z.id,
        kind: 'troll', // Kept internal key for compatibility; represents Zombie
        isZombie: true,
        isTroll: true,
        name: z.name,
        x: Number.isFinite(z.x) ? z.x : 12,
        y: Number.isFinite(z.y) ? z.y : 12,
        hp: z.hp,
        maxHp: z.maxHp,
        outsideMeters: outM,
        priority: (outM <= MAX_OUTSIDE_METERS ? 0 : 40) + outM,
        ref: z
      });
    }

    // 2. Hostile border encounter inside the community
    const streetFight = site.communityLife?.border?.street;
    if (streetFight && streetFight.phase === 'fight') {
      const gx = Number.isFinite(sceneContext?.pursuit?.x) ? sceneContext.pursuit.x : 12;
      const gy = Number.isFinite(sceneContext?.pursuit?.y) ? sceneContext.pursuit.y : 12;
      threats.push({
        id: 'border-street-' + (streetFight.guard?.key || 'raider'),
        kind: 'borderStreet',
        isZombie: false,
        name: streetFight.guard?.name || 'Hostile Intruder',
        x: gx,
        y: gy,
        hp: streetFight.hp ?? 100,
        maxHp: 100,
        outsideMeters: 0,
        priority: 2,
        ref: streetFight
      });
    }

    // 3. Rival war campaigns actively encroaching on this community
    if (world) {
      const allTowns = [
        ...(world.sites || []),
        ...(world.communityLife?.outposts || [])
      ];
      for (const other of allTowns) {
        if (!other || other.id === site.id) continue;
        const camp = other.communityLife?.border?.campaign;
        if (camp && camp.against === site.id && camp.phase !== 'return' && (camp.strength || 0) > 0) {
          const prog = clamp(camp.progress || 0, 0, 1);
          const distUnits = camp.phase === 'fight' ? 5 : 10 + (1 - prog) * 14;
          threats.push({
            id: 'campaign-' + other.id,
            kind: 'campaign',
            isZombie: false,
            name: (other.name || 'Hostile') + ' War Party',
            x: 12 + Math.cos(camp.seed || 1.2) * distUnits,
            y: Math.max(-14, 12 - Math.abs(Math.sin(camp.seed || 1.2)) * distUnits),
            hp: Math.max(40, (camp.strength || 1) * 45),
            maxHp: Math.max(40, (camp.initial || camp.strength || 1) * 45),
            outsideMeters: 25,
            priority: camp.phase === 'fight' ? 4 : 24,
            attackerSite: other,
            ref: camp
          });
        }
      }
    }

    // 4. Live hostile enemy units inside the forest/territory
    if (Array.isArray(sceneContext?.enemies)) {
      for (const en of sceneContext.enemies) {
        if (!en || en.dead || !Number.isFinite(en.x) || !Number.isFinite(en.y)) continue;
        if (en.foreignLand === true) continue;
        const outM = distanceOutsideTerritoryMeters(site, en.x, en.y);
        if (outM > MAX_OUTSIDE_METERS + 30) continue;
        threats.push({
          id: en.id || ('enemy-' + threats.length),
          kind: en.kind || 'intruder',
          isZombie: Boolean(en.isZombie || en.isTroll),
          name: en.name || 'Hostile Intruder',
          x: en.x,
          y: en.y,
          hp: en.hp ?? 100,
          maxHp: en.maxHp ?? 100,
          outsideMeters: outM,
          priority: 5 + outM,
          ref: en
        });
      }
    }

    threats.sort((a, b) => a.priority - b.priority);
    return threats;
  }

  /**
   * Weekly / Turn-based Autonomous Wolf Pack Defense against Zombies & Intruders
   * within the 100m outer territory perimeter.
   */
  function autonomousDefend(world, site, options = {}) {
    const out = { defended: false, blasts: 0, trollsSlain: 0, zombiesSlain: 0, campaignsRouted: 0, messages: [] };
    if (!world || !site || !hasStable(site)) return out;
    const ds = ensure(site);
    const pack = ds.dragons.filter(w => w && (!w.homeSiteId || w.homeSiteId === site.id));
    if (!pack.length) return out;

    const inWolfRange = th => th.kind === 'borderStreet' || th.kind === 'campaign' || (th.outsideMeters ?? distanceOutsideTerritoryMeters(site, th.x, th.y)) <= MAX_OUTSIDE_METERS + 12;
    const threats = findHomelandThreats(world, site, options.sceneContext).filter(inWolfRange);
    if (!threats.length) return out;

    const week = world.week || 1;
    for (let i = 0; i < pack.length; i++) {
      const wolf = pack[i];
      const liveThreats = findHomelandThreats(world, site, options.sceneContext).filter(inWolfRange);
      if (!liveThreats.length) break;

      const target = liveThreats[i % liveThreats.length] || liveThreats[0];
      const lineage = LINEAGES.find(l => l.id === wolf.lineage);
      const speedBonus = lineage?.speedBonus || 1.08;
      const hungerFactor = wolf.hunger > 15 ? 1.0 : 0.8;

      wolf.hunger = clamp(wolf.hunger - 3, 0, 100);
      wolf.blasts = (wolf.blasts || 0) + 1;
      wolf.autonomousBlasts = (wolf.autonomousBlasts || 0) + 1;
      ds.defenses = (ds.defenses || 0) + 1;
      ds.autonomousDefenses = (ds.autonomousDefenses || 0) + 1;
      out.defended = true;
      out.blasts++;

      if (target.kind === 'troll' && root.EarthGiantTrolls) {
        const rawDmg = Math.round((130 + (speedBonus - 1) * 180) * hungerFactor);
        const res = root.EarthGiantTrolls.attackTroll(world, site, target.id, {
          source: 'wolfBite',
          damage: rawDmg,
          wolfName: wolf.name,
          dragonName: wolf.name,
          autonomous: true
        });
        if (res?.ok) {
          if (res.killed) {
            wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
            out.trollsSlain++;
            out.zombiesSlain++;
          }
          record(site, world, res.message);
          out.messages.push(res.message);
        }
      } else if (target.kind === 'campaign' && target.ref) {
        const camp = target.ref;
        const loss = Math.max(2, Math.ceil((camp.strength || 2) * 0.5));
        camp.strength = Math.max(0, (camp.strength || 0) - loss);
        camp.casualties = (camp.casualties || 0) + loss;
        const routed = camp.strength <= 1;
        if (routed) {
          camp.phase = 'return';
          camp.progress = Math.max(0.15, 1 - (camp.progress || 0.5));
          camp.outcome = 'driven back by ' + site.name + '\'s guardian wolf pack';
          wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
          out.campaignsRouted++;
        }
        site.wellbeing = clamp((site.wellbeing || 50) + 1, 0, 100);
        const msg = routed
          ? wolf.name + ' and the wolf pack tore into the ' + target.name + ' and drove them out of ' + site.name + '\'s enchanted forest!'
          : wolf.name + ' ambushed the encroaching ' + target.name + ' (-' + loss + ' hostile fighters) defending ' + site.name + '!';
        record(site, world, msg);
        out.messages.push(msg);
      } else if (target.kind === 'borderStreet' && target.ref) {
        const sf = target.ref;
        sf.phase = 'repelled';
        sf.hp = 0;
        if (site.communityLife?.border) delete site.communityLife.border.street;
        wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
        const msg = wolf.name + ' lunged from the enchanted woods and drove off ' + target.name + '!';
        record(site, world, msg);
        out.messages.push(msg);
      }
    }

    if (out.defended) ds.lastDefenseWeek = week;
    return out;
  }

  /**
   * Real-Time Majestic Wolf Pack AI:
   * - Roams freely across the Enchanted Forest community and out to EXACTLY 100.0 meters
   *   beyond the community's territory walls (NEVER more than 100.0 m!).
   * - Sprints, intercepts, lunges and bites Zombies that enter the 100m perimeter!
   * - At night under the Full Moon, wolves pause together in synchronized Full Moon
   *   pack howls whenever they are not locked in active melee combat!
   */
  function stepAutonomousDefenders(world, site, dt = 0.016, sceneContext = {}) {
    const empty = { poses: [], events: [], defendingCount: 0, howlingCount: 0, isPackHowling: false };
    if (!site || !hasStable(site)) return empty;
    const ds = ensure(site);
    const pack = ds.dragons.filter(w => w && (!w.homeSiteId || w.homeSiteId === site.id));
    if (!pack.length) return empty;

    const cave = stableLocation(site) || { x: -4.8, y: 6.2 };
    const denFront = { x: cave.x, y: cave.y + 2.45 };
    const wb = wolfBoundsForSite(site);
    const step = clamp(dt || 0.016, 0.001, 0.25);
    const visualTime = Number.isFinite(sceneContext.time) ? sceneContext.time : ((site._dragonClock || 0) + step);
    site._dragonClock = visualTime;
    const isNight = Boolean(sceneContext.isNight);

    const FP = root.EarthFlightPhysics;
    const fortStage = site.communityLife?.border?.defence?.stage || 0;
    const { lvl: tLevel, hasWater } = territoryParams(site);
    const solidSet = FP?.collectSolidObstacles
      ? FP.collectSolidObstacles(site, sceneContext?.solids)
      : { walls: [], buildings: [], all: [] };
    const gateways = FP?.perimeterGateways
      ? FP.perimeterGateways(fortStage, tLevel, hasWater, site)
      : [];
    const WOLF_RADIUS = 0.36;

    const wallBetween = (ax, ay, bx, by) => {
      if (!FP?.segmentIntersectsBox || !solidSet.walls.length) return null;
      for (const wOb of solidSet.walls) {
        if (FP.segmentIntersectsBox(ax, ay, bx, by, wOb.box, 0.14).hit) return wOb;
      }
      return null;
    };

    // If an intact solid perimeter wall blocks the straight path from (sx, sy) to (gx, gy),
    // steer the wolf toward the closest passable gateway or smashed wall breach!
    const steerAroundWalls = (sx, sy, gx, gy) => {
      if (!gateways.length || !wallBetween(sx, sy, gx, gy)) return { x: gx, y: gy, viaGate: false };
      let bestGate = null;
      let bestCost = Infinity;
      for (const g of gateways) {
        const dToGate = Math.hypot(g.x - sx, g.y - sy);
        const dFromGate = Math.hypot(gx - g.x, gy - g.y);
        const cost = dToGate + dFromGate;
        if (cost < bestCost) {
          bestCost = cost;
          bestGate = g;
        }
      }
      if (!bestGate) return { x: gx, y: gy, viaGate: false };
      // Once close to the gate threshold, aim slightly through the doorway onto the far side!
      const dGate = Math.hypot(bestGate.x - sx, bestGate.y - sy);
      if (dGate < 1.15) {
        const pushDx = gx - bestGate.x;
        const pushDy = gy - bestGate.y;
        const pLen = Math.hypot(pushDx, pushDy) || 1;
        return { x: bestGate.x + (pushDx / pLen) * 1.6, y: bestGate.y + (pushDy / pLen) * 1.6, viaGate: true };
      }
      return { x: bestGate.x, y: bestGate.y, viaGate: true };
    };

    const moveWolfGrounded = (st, destX, destY) => {
      const clampedDest = clampWolfPosition(site, destX, destY);
      if (!FP?.moveWithSolidCollision || !solidSet.all.length) {
        const moved = Math.hypot(clampedDest.x - st.x, clampedDest.y - st.y);
        st.x = clampedDest.x;
        st.y = clampedDest.y;
        return { moved, hitWall: null, hitBuilding: null };
      }
      const res = FP.moveWithSolidCollision(st.x, st.y, clampedDest.x, clampedDest.y, WOLF_RADIUS, solidSet);
      const safe = clampWolfPosition(site, res.x, res.y);
      const moved = Math.hypot(safe.x - st.x, safe.y - st.y);
      st.x = safe.x;
      st.y = safe.y;
      return { moved, hitWall: res.hitWall, hitBuilding: res.hitBuilding };
    };

    // Synchronized Full Moon pack howl cycle every ~11.5s during night (6.4s of pack howling together!)
    const moonCycle = visualTime % 11.5;
    const packMoonChorus = isNight && moonCycle < 6.4;

    const map = getRuntimeMap(site);
    const threats = findHomelandThreats(world, site, sceneContext);
    const events = [];
    const poses = [];
    let defendingCount = 0;
    let howlingCount = 0;
    const TILT = 0.51;

    for (let i = 0; i < pack.length; i++) {
      const wolf = pack[i];
      const lineage = LINEAGES.find(l => l.id === wolf.lineage);
      const speedBonus = lineage?.speedBonus || 1.08;
      const ring = i % 4;

      let st = map.get(wolf.id);
      if (!st) {
        const initAng = 0.65 + i * 1.15;
        const rawPos = clampWolfPosition(site, denFront.x + Math.cos(initAng) * (1.8 + ring * 0.8), denFront.y + Math.sin(initAng) * (1.4 + ring * 0.6));
        const resolvedInit = FP?.moveWithSolidCollision
          ? FP.moveWithSolidCollision(rawPos.x, rawPos.y, rawPos.x, rawPos.y, WOLF_RADIUS, solidSet)
          : rawPos;
        st = {
          x: resolvedInit.x,
          y: resolvedInit.y,
          z: 0,
          angle: 0,
          stridePhase: i * 1.4,
          speedRatio: 0,
          roamAngle: initAng,
          biteTimer: 0,
          biteCooldown: 0.25 + (i % 3) * 0.16,
          howlTimer: 0,
          recoverTimer: 0,
          state: 'roam',
          targetId: null,
          targetKind: null,
          targetName: null,
          biteTarget: null,
          announcedTargetId: null
        };
        map.set(wolf.id, st);
      }

      const prevX = st.x;
      const prevY = st.y;

      if (st.biteTimer > 0) st.biteTimer = Math.max(0, st.biteTimer - step);
      if (st.biteCooldown > 0) st.biteCooldown = Math.max(0, st.biteCooldown - step);
      if (st.howlTimer > 0) st.howlTimer = Math.max(0, st.howlTimer - step);
      if (st.recoverTimer > 0) {
        st.recoverTimer = Math.max(0, st.recoverTimer - step);
        wolf.hp = clamp((wolf.hp ?? 280) + 32 * step, 1, wolf.maxHp || 280);
      } else if ((wolf.hp ?? 280) < (wolf.maxHp || 280)) {
        wolf.hp = clamp((wolf.hp ?? 280) + 6 * step, 1, wolf.maxHp || 280);
      }

      const activeThreats = threats.filter(th => {
        if (th.kind === 'troll') return th.ref && th.ref.state !== 'slain' && th.ref.hp > 0;
        if (th.kind === 'campaign') return th.ref && th.ref.phase !== 'return' && (th.ref.strength || 0) > 0;
        if (th.kind === 'borderStreet') return site.communityLife?.border?.street?.phase === 'fight';
        return !th.ref?.dead && (th.ref?.hp == null || th.ref.hp > 0);
      });

      const inRangeThreats = activeThreats.filter(th => distanceOutsideTerritoryMeters(site, th.x, th.y) <= MAX_OUTSIDE_METERS + 4);
      const immediateThreat = inRangeThreats.find(th => Math.hypot(th.x - st.x, th.y - st.y) <= 8.5 && !wallBetween(st.x, st.y, th.x, th.y));

      if (st.recoverTimer > 0) {
        st.state = 'retreat';
        const goal = st.retreatGoal || denFront;
        const steer = steerAroundWalls(st.x, st.y, goal.x, goal.y);
        const dx = steer.x - st.x;
        const dy = steer.y - st.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.75) {
          const spd = 7.4 * speedBonus * step;
          const move = Math.min(d, spd);
          moveWolfGrounded(st, st.x + (dx / d) * move, st.y + (dy / d) * move);
        }
      } else if ((packMoonChorus || st.howlTimer > 0) && !immediateThreat) {
        // FULL MOON PACK HOWLING: wolves gather in moonlit forest clearing and howl together at the Full Moon!
        st.state = 'howling';
        howlingCount++;
        const gatherX = clamp(denFront.x + 1.4 + (i % 3 - 1) * 1.8, wb.territoryMinX + 1.5, wb.territoryMaxX - 1.5);
        const gatherY = clamp(denFront.y + 0.8 + Math.floor(i / 3) * 1.5, wb.territoryMinY + 1.5, wb.territoryMaxY - 1.5);
        const steer = steerAroundWalls(st.x, st.y, gatherX, gatherY);
        const gx = steer.x - st.x;
        const gy = steer.y - st.y;
        const gd = Math.hypot(gx, gy);
        if (gd > 0.65 && st.howlTimer <= 0) {
          const move = Math.min(gd, 6.0 * speedBonus * step);
          moveWolfGrounded(st, st.x + (gx / gd) * move, st.y + (gy / gd) * move);
        } else {
          st.angle = -0.35 + (i % 2 === 0 ? 0.14 : -0.14);
        }
      } else if (activeThreats.length > 0) {
        defendingCount++;
        const pool = inRangeThreats.length ? inRangeThreats : activeThreats;
        const target = pool.find(th => th.id === st.targetId) || pool[i % pool.length] || pool[0];
        st.targetId = target.id;
        st.targetKind = target.kind;
        st.targetName = target.name;

        const tx = target.x;
        const ty = target.y;
        const clampedGoal = clampWolfPosition(site, tx, ty);
        const distToTarget = Math.hypot(tx - st.x, ty - st.y);
        const blockedByWall = Boolean(wallBetween(st.x, st.y, tx, ty));
        const biteReach = 2.35;
        const sprintSpeed = 9.6 * speedBonus;

        if (st.announcedTargetId !== target.id && distToTarget <= 11.5) {
          st.announcedTargetId = target.id;
          events.push({
            type: 'dragonIntercept',
            dragon: wolf,
            wolf,
            target,
            x: st.x,
            y: st.y,
            tx,
            ty,
            message: wolf.name + ' charged through the enchanted forest to intercept ' + target.name + '!'
          });
        }

        if (distToTarget > biteReach || blockedByWall) {
          const steer = steerAroundWalls(st.x, st.y, clampedGoal.x, clampedGoal.y);
          const gx = steer.x - st.x;
          const gy = steer.y - st.y;
          const gDist = Math.hypot(gx, gy);
          if (gDist > 0.45) {
            st.state = 'intercept';
            const stepDist = Math.min(gDist, sprintSpeed * step);
            moveWolfGrounded(st, st.x + (gx / gDist) * stepDist, st.y + (gy / gDist) * stepDist);
          } else {
            // Holding the exact 100-meter forest perimeter line, snarling at zombies beyond 100m!
            st.state = 'guard';
            st.roamAngle += 1.2 * step;
            const patrolPos = clampWolfPosition(
              site,
              clampedGoal.x + Math.cos(st.roamAngle) * 0.55,
              clampedGoal.y + Math.sin(st.roamAngle) * 0.55
            );
            moveWolfGrounded(st, patrolPos.x, patrolPos.y);
            st.angle = Math.atan2(((tx - st.x) + (ty - st.y)) * TILT, (tx - st.x) - (ty - st.y));
          }
        } else {
          // FIERCE WOLF MELEE LUNGE & FANG BITE (strictly grounded & solid-colliding!)
          st.state = 'attack';
          const dir = i % 2 === 0 ? 1 : -1;
          st.roamAngle += dir * 2.2 * step;
          const orb = clampWolfPosition(
            site,
            tx + Math.cos(st.roamAngle) * 1.45,
            ty + Math.sin(st.roamAngle) * 1.45
          );
          const ox = orb.x - st.x;
          const oy = orb.y - st.y;
          const od = Math.hypot(ox, oy);
          if (od > 0.1) {
            const pull = Math.min(od, 6.2 * speedBonus * step);
            moveWolfGrounded(st, st.x + (ox / od) * pull, st.y + (oy / od) * pull);
          }
          st.angle = Math.atan2(((tx - st.x) + (ty - st.y)) * TILT, (tx - st.x) - (ty - st.y));

          if (st.biteCooldown <= 0 && !wallBetween(st.x, st.y, tx, ty)) {
            st.biteCooldown = 1.05;
            st.biteTimer = 0.42;
            st.biteTarget = { x: tx, y: ty, name: target.name, id: target.id };

            const hungerFactor = wolf.hunger > 15 ? 1.0 : 0.8;
            wolf.hunger = clamp(wolf.hunger - 1.2, 0, 100);
            wolf.blasts = (wolf.blasts || 0) + 1;
            wolf.autonomousBlasts = (wolf.autonomousBlasts || 0) + 1;
            ds.defenses = (ds.defenses || 0) + 1;
            ds.autonomousDefenses = (ds.autonomousDefenses || 0) + 1;

            let dealt = 0;
            let killed = false;
            let msg = '';

            if (target.kind === 'troll' && root.EarthGiantTrolls) {
              const rawDmg = Math.round(62 * speedBonus * hungerFactor);
              const hit = root.EarthGiantTrolls.attackTroll(world, site, target.id, {
                source: 'wolfBite',
                damage: rawDmg,
                wolfName: wolf.name,
                dragonName: wolf.name,
                autonomous: true
              });
              if (hit?.ok) {
                dealt = hit.dealt;
                killed = Boolean(hit.killed);
                msg = hit.message;
                if (killed) {
                  wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
                  record(site, world, msg);
                  st.targetId = null;
                  st.announcedTargetId = null;
                }
              }
            } else if (target.kind === 'campaign' && target.ref) {
              const camp = target.ref;
              const loss = Math.max(1, Math.ceil((camp.strength || 1) * 0.4));
              camp.strength = Math.max(0, (camp.strength || 0) - loss);
              camp.casualties = (camp.casualties || 0) + loss;
              dealt = loss * 45;
              if (camp.strength <= 1) {
                camp.phase = 'return';
                camp.outcome = 'driven back by ' + wolf.name;
                killed = true;
                wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
                st.targetId = null;
                st.announcedTargetId = null;
              }
              msg = killed
                ? wolf.name + ' drove off the ' + target.name + '!'
                : wolf.name + ' mauled the ' + target.name + ' (-' + loss + ' hostile fighters)!';
              if (killed) record(site, world, msg);
            } else if (target.kind === 'borderStreet' && target.ref) {
              const sf = target.ref;
              sf.hp = Math.max(0, (sf.hp ?? 100) - 55);
              dealt = 55;
              if (sf.hp <= 0) {
                sf.phase = 'repelled';
                if (site.communityLife?.border) delete site.communityLife.border.street;
                killed = true;
                wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
                st.targetId = null;
                st.announcedTargetId = null;
              }
              msg = killed
                ? wolf.name + ' chased away ' + target.name + '!'
                : wolf.name + ' lunged and bit ' + target.name + ' (-55 HP)!';
              if (killed) record(site, world, msg);
            } else {
              dealt = Math.round(72 * speedBonus * hungerFactor);
              const res = sceneContext.onEnemyHit?.(target, dealt, wolf);
              killed = Boolean(res?.killed);
              if (killed) {
                wolf.autonomousKills = (wolf.autonomousKills || 0) + 1;
                st.targetId = null;
                st.announcedTargetId = null;
              }
              msg = res?.message || (
                killed
                  ? wolf.name + ' tore down ' + target.name + ' defending ' + site.name + '!'
                  : wolf.name + ' bit ' + target.name + ' (-' + dealt + ' HP)!'
              );
              if (killed) record(site, world, msg);
            }

            events.push({
              type: 'wolfBite',
              dragon: wolf,
              wolf,
              target,
              x: st.x,
              y: st.y,
              z: 0.4,
              tx,
              ty,
              dealt,
              killed,
              message: msg
            });
          }
        }
      } else {
        // Peaceful Majestic Wolf roaming through the Enchanted Forest on solid ground (never through walls/buildings!)
        st.state = 'roam';
        st.targetId = null;
        st.targetKind = null;
        st.targetName = null;
        st.announcedTargetId = null;
        st.biteTarget = null;
        const roamT = visualTime * (0.28 + ring * 0.05) + i * 2.3;
        const rx = 10.5 + ring * 4.2;
        const ry = 9.0 + ring * 3.6;
        const goal = clampWolfPosition(site, 12 + Math.cos(roamT) * rx, 11 + Math.sin(roamT) * ry);
        const steer = steerAroundWalls(st.x, st.y, goal.x, goal.y);
        const dx = steer.x - st.x;
        const dy = steer.y - st.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.25) {
          const move = Math.min(dist, 4.4 * speedBonus * step);
          moveWolfGrounded(st, st.x + (dx / dist) * move, st.y + (dy / dist) * move);
        }
      }

      // HARD INVARIANT: Majestic Wolves NEVER travel more than 100.0 meters outside community territory
      // and NEVER overlap any solid wall or building!
      const finalClamped = clampWolfPosition(site, st.x, st.y);
      st.x = finalClamped.x;
      st.y = finalClamped.y;
      st.z = 0;

      // Ground-coupled locomotion: stridePhase advances STRICTLY from real paw-over-earth distance moved!
      const realDx = st.x - prevX;
      const realDy = st.y - prevY;
      const movedDist = Math.hypot(realDx, realDy);
      const instantSpeed = movedDist / step;
      st.speedRatio = st.speedRatio != null
        ? st.speedRatio + (clamp(instantSpeed / 8.5, 0, 1.15) - st.speedRatio) * Math.min(1, step * 10)
        : clamp(instantSpeed / 8.5, 0, 1.15);
      if (movedDist > 0.002) {
        st.stridePhase = (st.stridePhase || 0) + movedDist * 2.85;
        if (st.state !== 'attack' && st.state !== 'guard' && st.state !== 'howling') {
          st.angle = Math.atan2((realDx + realDy) * TILT, realDx - realDy);
        }
      }

      poses.push({
        wolf,
        dragon: wolf,
        x: st.x,
        y: st.y,
        z: 0,
        angle: st.angle,
        stridePhase: st.stridePhase,
        speedRatio: st.state === 'howling' ? 0 : st.speedRatio,
        moving: movedDist > 0.002,
        size: st.state === 'attack' || st.state === 'intercept' ? 1.04 : 0.96,
        depth: st.x + st.y + 0.48,
        state: st.state,
        defending: st.state === 'attack' || st.state === 'intercept' || st.state === 'guard',
        howling: st.state === 'howling',
        biting: st.biteTimer > 0,
        breathingFire: st.biteTimer > 0,
        biteTarget: st.biteTimer > 0 ? st.biteTarget : null,
        fireTarget: st.biteTimer > 0 ? st.biteTarget : null,
        targetName: st.targetName,
        outsideMeters: finalClamped.outsideMeters
      });
    }

    return { poses, events, defendingCount, howlingCount, isPackHowling: howlingCount > 0 };
  }

  function getAutonomousPoses(site) {
    if (!site || !hasStable(site)) return [];
    const ds = ensure(site);
    const map = runtimeState.get(site);
    if (!map || !map.size) return [];
    const poses = [];
    for (const wolf of ds.dragons) {
      const st = map.get(wolf.id);
      if (!st) continue;
      poses.push({
        wolf,
        dragon: wolf,
        x: st.x,
        y: st.y,
        z: 0,
        angle: st.angle,
        stridePhase: st.stridePhase || 0,
        speedRatio: st.state === 'howling' ? 0 : (st.speedRatio || 0),
        moving: (st.speedRatio || 0) > 0.05,
        size: st.state === 'attack' || st.state === 'intercept' ? 1.04 : 0.96,
        depth: st.x + st.y + 0.48,
        state: st.state,
        defending: st.state === 'attack' || st.state === 'intercept' || st.state === 'guard',
        howling: st.state === 'howling',
        biting: st.biteTimer > 0,
        breathingFire: st.biteTimer > 0,
        biteTarget: st.biteTimer > 0 ? st.biteTarget : null,
        fireTarget: st.biteTimer > 0 ? st.biteTarget : null,
        targetName: st.targetName,
        outsideMeters: distanceOutsideTerritoryMeters(site, st.x, st.y)
      });
    }
    return poses;
  }

  function valid(siteOrStable) {
    if (siteOrStable == null) return true;
    const ds = (typeof siteOrStable === 'object' && !Array.isArray(siteOrStable) && Array.isArray(siteOrStable.dragons))
      ? siteOrStable
      : siteOrStable?.dragonStable;
    if (ds == null) return true;
    if (typeof ds !== 'object' || Array.isArray(ds)) return false;
    if (!Array.isArray(ds.dragons) || !Array.isArray(ds.workers)) return false;
    if (ds.wizards != null && !Array.isArray(ds.wizards)) return false;
    if (!Number.isFinite(ds.foodStock) || ds.foodStock < 0 || ds.foodStock > LARDER_MAX * 2) return false;
    return ds.dragons.every(d => d && typeof d.id === 'string' && typeof d.name === 'string' && Number.isFinite(d.hunger)) &&
      ds.workers.every(w => w && typeof w.id === 'string' && typeof w.name === 'string');
  }

  const api = Object.freeze({
    LINEAGES,
    WOLF_NAMES,
    LARDER_MAX,
    WOLF_COST,
    DRAGON_COST,
    METERS_PER_UNIT,
    MAX_OUTSIDE_METERS,
    MAX_OUTSIDE_UNITS,
    hasStable,
    stableLocation,
    wolfBoundsForSite,
    wallBoundsForSite: wolfBoundsForSite,
    distanceOutsideTerritoryMeters,
    clampWolfPosition,
    ensure,
    ensureStarterPack,
    findHomelandThreats,
    autonomousDefend,
    stepAutonomousDefenders,
    getAutonomousPoses,
    summonDragon,
    callWolf: summonDragon,
    assignWorker,
    replenishLarder,
    feedDragon,
    damageWolf,
    packHowl,
    tick,
    valid
  });

  root.EarthDragonStable = api;
  root.EarthWolfCave = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
