/* Dragon Stable: enchanted dragons, wizards trained at the stable,
   worker-replenished feeding larder, unrestricted flight, and fire-breath attacks. */
(function (root) {
  'use strict';

  const LINEAGES = Object.freeze([
    { id: 'solar', title: 'Solar Gold', scale: '#e6b85c', accent: '#fff0a8', wing: '#d97a36', aura: '#ffd670', fire: '#ff8a2b', speedBonus: 1.06 },
    { id: 'tempest', title: 'Sapphire Tempest', scale: '#4b9be0', accent: '#9ae6ff', wing: '#295d9c', aura: '#68d8ff', fire: '#ff9442', speedBonus: 1.12 },
    { id: 'aurora', title: 'Emerald Aurora', scale: '#3eb88a', accent: '#a8ffd8', wing: '#1f705c', aura: '#64f5b8', fire: '#ff9d3b', speedBonus: 1.04 },
    { id: 'starfire', title: 'Amethyst Starfire', scale: '#9a68db', accent: '#e5b8ff', wing: '#5b3494', aura: '#c88aff', fire: '#ff6b4a', speedBonus: 1.10 },
    { id: 'solstice', title: 'Ruby Solstice', scale: '#d65353', accent: '#ffb8a0', wing: '#8c2830', aura: '#ff7d6b', fire: '#ff5a1f', speedBonus: 1.08 }
  ]);

  const DRAGON_NAMES = ['Aurelia', 'Vaelor', 'Sylphira', 'Nyxaris', 'Cinderveil', 'Zephyros', 'Solstice', 'Astralis', 'Pyralis', 'Lumina'];
  const WIZARD_TITLES = ['Skyweaver', 'Embercaller', 'Astral Rider', 'Windbinder', 'Runekeeper'];

  const LARDER_MAX = 36;
  const DRAGON_COST = Object.freeze({ funds: 6, food: 3 });
  const WIZARD_COST = Object.freeze({ funds: 4 });
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

  function ensure(site) {
    if (!site) return null;
    if (!site.dragonStable) {
      site.dragonStable = {
        built: hasStable(site),
        foodStock: 12,
        workers: [],
        wizards: [],
        dragons: [],
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
    ds.wizards ||= [];
    ds.dragons ||= [];
    ds.scorched ||= [];
    ds.log ||= [];
    if (!Number.isFinite(ds.foodStock)) ds.foodStock = 12;
    if (!Number.isSafeInteger(ds.serial)) ds.serial = ds.dragons.length + ds.wizards.length;
    return ds;
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

  function isWizard(site, actorId) {
    if (!site?.dragonStable?.wizards?.length || !actorId) return false;
    return site.dragonStable.wizards.some(w => w.id === actorId || w.residentId === actorId);
  }

  function canFlyDragon(site, actorId, dragonId) {
    if (!hasStable(site)) {
      return { ok: false, reason: 'Build a Dragon Stable first.' };
    }
    const ds = ensure(site);
    const dragon = dragonId ? ds.dragons.find(d => d.id === dragonId) : ds.dragons[0];
    if (!dragon) {
      return { ok: false, reason: 'Summon a dragon at the Dragon Stable before flying.' };
    }
    if (dragon.homeSiteId && dragon.homeSiteId !== site.id) {
      return {
        ok: false,
        reason: dragon.name + ' is spiritually bound to the soul of ' + (dragon.homeSiteName || 'its home community') + ' and refuses to fly in another community.'
      };
    }
    if (!isWizard(site, actorId)) {
      return {
        ok: false,
        reason: 'Only a Wizard can fly a dragon. Train a Wizard at the Dragon Stable or switch to a Wizard first.'
      };
    }
    const wizard = ds.wizards.find(w => w.id === actorId || w.residentId === actorId);
    if (wizard?.homeSiteId && wizard.homeSiteId !== site.id) {
      return {
        ok: false,
        reason: wizard.name + '\'s wizardry is bound to ' + (wizard.homeSiteName || 'their originating community') + '; full abilities are only enabled in their home land.'
      };
    }
    if (dragon.hunger <= 5) {
      return {
        ok: false,
        reason: dragon.name + ' is too hungry to take off. Feed ' + dragon.name + ' from the Dragon Stable larder first.'
      };
    }
    return { ok: true, dragon, wizard };
  }

  function findWizardAcrossWorld(world, site, actorId) {
    if (!actorId) return null;
    const local = site?.dragonStable?.wizards?.find(w => w.id === actorId || w.residentId === actorId);
    if (local) return { wizard: local, originSite: site };
    const allTowns = [
      ...(world?.sites || []),
      ...(world?.communityLife?.outposts || [])
    ];
    for (const s of allTowns) {
      const found = s?.dragonStable?.wizards?.find(w => w.id === actorId || w.residentId === actorId);
      if (found) return { wizard: found, originSite: s };
    }
    return null;
  }

  /**
   * Returns a Wizard's spiritual resonance status in the given community.
   * Wizards' abilities are only fully enabled while in the community from which they originate.
   */
  function wizardPowerStatus(world, site, actorId) {
    const found = findWizardAcrossWorld(world, site, actorId);
    if (!found) {
      return {
        isWizard: false,
        inOriginCommunity: false,
        fullPower: false,
        resonance: 0,
        originSiteId: null,
        originSiteName: null,
        wizard: null,
        reason: 'Only a trained Wizard can channel the Arcane Staff.'
      };
    }
    const { wizard, originSite } = found;
    const originId = wizard.homeSiteId || originSite?.id || site?.id || null;
    const originName = wizard.homeSiteName || originSite?.name || site?.name || 'their home community';
    const inOrigin = Boolean(site && originId && site.id === originId);
    return {
      isWizard: true,
      inOriginCommunity: inOrigin,
      fullPower: inOrigin,
      resonance: inOrigin ? 100 : 25,
      originSiteId: originId,
      originSiteName: originName,
      wizard,
      reason: inOrigin
        ? wizard.name + ' is attuned to the soul of ' + originName + ' (full Wizard abilities enabled).'
        : wizard.name + '\'s arcane staff draws power from the soul of ' + originName + '; full abilities are only enabled while in their originating community.'
    };
  }

  function canEnterCommunity(site, dragon, targetSiteId) {
    const homeId = dragon?.homeSiteId || site?.id;
    const homeName = dragon?.homeSiteName || site?.name || 'their home community';
    if (targetSiteId && homeId && targetSiteId !== homeId) {
      return {
        ok: false,
        refused: true,
        reason: (dragon?.name || 'The dragon') + ' is a deeply spiritual protector bound to the soul of ' + homeName + ' and refuses to enter the lands of another community.'
      };
    }
    return { ok: true, refused: false };
  }

  function trainWizard(world, site, residentId, customName) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Dragon Stable before training Wizards.' };
    const ds = ensure(site);
    const targetId = residentId || root.EarthAgency?.actorId?.(site) || 'steward';
    if (isWizard(site, targetId)) {
      return { ok: false, message: 'That resident is already a trained Wizard of the Dragon Stable.' };
    }
    if ((site.funds || 0) < WIZARD_COST.funds) {
      return { ok: false, message: 'Training a Wizard requires ' + WIZARD_COST.funds + ' community funds.' };
    }
    site.funds -= WIZARD_COST.funds;
    ds.serial++;
    const persona = root.EarthPersonas?.profile?.(site, targetId) || root.EarthAgency?.identity?.(site, targetId);
    const name = (customName && String(customName).trim()) || persona?.name || ('Wizard ' + ds.serial);
    const title = WIZARD_TITLES[(ds.wizards.length) % WIZARD_TITLES.length];
    const wizard = {
      id: targetId,
      residentId: targetId,
      name,
      title,
      homeSiteId: site.id,
      homeSiteName: site.name,
      trainedWeek: world?.week || 1,
      flights: 0,
      robeColor: ['#3b367d', '#24526e', '#5d2f6e', '#265c52'][ds.wizards.length % 4]
    };
    ds.wizards.push(wizard);
    const msg = name + ' was initiated as a Wizard (' + title + ') of ' + site.name + ', attuned to protect their originating homeland.';
    record(site, world, msg);
    return { ok: true, wizard, message: msg };
  }

  function createNewWizard(world, site, nameInput) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Dragon Stable before summoning Wizards.' };
    const ds = ensure(site);
    if ((site.funds || 0) < WIZARD_COST.funds) {
      return { ok: false, message: 'Creating a Wizard requires ' + WIZARD_COST.funds + ' community funds.' };
    }
    site.funds -= WIZARD_COST.funds;
    ds.serial++;
    const baseNames = ['Lyra Vance', 'Orin Sol', 'Seraphina Gale', 'Kaelen Frost', 'Isolde Star', 'Tarin Ember'];
    const name = (nameInput && String(nameInput).trim().slice(0, 40)) || baseNames[ds.wizards.length % baseNames.length];
    const wizId = 'wizard-' + ds.serial;
    const title = WIZARD_TITLES[ds.wizards.length % WIZARD_TITLES.length];
    const wizard = {
      id: wizId,
      residentId: wizId,
      name,
      title,
      homeSiteId: site.id,
      homeSiteName: site.name,
      trainedWeek: world?.week || 1,
      flights: 0,
      robeColor: ['#3b367d', '#24526e', '#5d2f6e', '#265c52'][ds.wizards.length % 4],
      stableBorn: true
    };
    ds.wizards.push(wizard);
    const msg = name + ' joined ' + site.name + '\'s Dragon Stable as a ' + title + ' Wizard, bound to defend this homeland.';
    record(site, world, msg);
    return { ok: true, wizard, message: msg };
  }

  function summonDragon(world, site, lineageId, customName) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Dragon Stable before raising a dragon.' };
    const ds = ensure(site);
    if ((site.funds || 0) < DRAGON_COST.funds || (site.food || 0) < DRAGON_COST.food) {
      return {
        ok: false,
        message: 'Raising an enchanted dragon requires ' + DRAGON_COST.funds + ' funds and ' + DRAGON_COST.food + ' food.'
      };
    }
    site.funds -= DRAGON_COST.funds;
    site.food -= DRAGON_COST.food;
    ds.serial++;
    const lineage = LINEAGES.find(l => l.id === lineageId) || LINEAGES[ds.dragons.length % LINEAGES.length];
    const name = (customName && String(customName).trim().slice(0, 36)) ||
      (DRAGON_NAMES[ds.dragons.length % DRAGON_NAMES.length] + (ds.dragons.length >= DRAGON_NAMES.length ? ' ' + (ds.dragons.length + 1) : ''));
    const dragon = {
      id: 'dragon-' + ds.serial,
      name,
      lineage: lineage.id,
      lineageTitle: lineage.title,
      homeSiteId: site.id,
      homeSiteName: site.name,
      scale: lineage.scale,
      accent: lineage.accent,
      wing: lineage.wing,
      aura: lineage.aura,
      fire: lineage.fire,
      hunger: 100, // 100 = fully fed, 0 = starving
      firePower: 100,
      flights: 0,
      blasts: 0,
      raisedWeek: world?.week || 1
    };
    ds.dragons.push(dragon);
    const msg = name + ' (' + lineage.title + ') hatched at ' + site.name + '\'s Dragon Stable, spiritually bound as a protector of these lands.';
    record(site, world, msg);
    return { ok: true, dragon, message: msg };
  }

  function assignWorker(world, site, workerId, workerName) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Dragon Stable first.' };
    const ds = ensure(site);
    if (!workerId) return { ok: false, message: 'Choose a resident to work at the Dragon Stable.' };
    const existing = ds.workers.find(w => w.id === workerId);
    if (existing) {
      ds.workers = ds.workers.filter(w => w.id !== workerId);
      const msg = existing.name + ' stepped down from Dragon Stable keeper duties.';
      record(site, world, msg);
      return { ok: true, assigned: false, message: msg };
    }
    const persona = root.EarthPersonas?.profile?.(site, workerId) || root.EarthAgency?.identity?.(site, workerId);
    const name = workerName || persona?.name || workerId;
    ds.workers.push({ id: workerId, name, sinceWeek: world?.week || 1, mealsReplenished: 0 });
    const msg = name + ' now works at the Dragon Stable, regularly replenishing dragon food and feeding the dragons.';
    record(site, world, msg);
    return { ok: true, assigned: true, message: msg };
  }

  function replenishLarder(world, site, amount = 6) {
    if (!hasStable(site)) return { ok: false, message: 'Build a Dragon Stable first.' };
    const ds = ensure(site);
    const space = Math.max(0, LARDER_MAX - ds.foodStock);
    if (space <= 0) return { ok: false, message: 'The Dragon Stable larder is already full.' };
    const take = Math.min(space, Math.max(1, Math.floor(amount)), site.food || 0);
    if (take <= 0) return { ok: false, message: 'No community food available to stock the Dragon Stable.' };
    site.food -= take;
    ds.foodStock = Math.min(LARDER_MAX, ds.foodStock + take);
    const msg = 'Replenished the Dragon Stable larder with +' + take + ' food (' + ds.foodStock + '/' + LARDER_MAX + ').';
    record(site, world, msg);
    return { ok: true, added: take, foodStock: ds.foodStock, message: msg };
  }

  function feedDragon(world, site, dragonId, byWorker = '') {
    if (!hasStable(site)) return { ok: false, message: 'Build a Dragon Stable first.' };
    const ds = ensure(site);
    const dragon = ds.dragons.find(d => d.id === dragonId);
    if (!dragon) return { ok: false, message: 'Dragon not found.' };
    if (dragon.hunger >= 98) return { ok: false, message: dragon.name + ' is already well fed.' };
    if (ds.foodStock < FEED_FOOD_COST) {
      if ((site.food || 0) >= FEED_FOOD_COST) {
        site.food -= FEED_FOOD_COST;
        ds.foodStock += FEED_FOOD_COST;
      } else {
        return { ok: false, message: 'The Dragon Stable larder is empty. Assign stable workers or replenish food.' };
      }
    }
    ds.foodStock = Math.max(0, ds.foodStock - FEED_FOOD_COST);
    const before = dragon.hunger;
    dragon.hunger = clamp(dragon.hunger + 38, 0, 100);
    dragon.firePower = clamp((dragon.firePower || 80) + 25, 0, 100);
    const msg = (byWorker ? byWorker + ' fed ' : 'Fed ') + dragon.name + ' (' + Math.round(before) + '% → ' + Math.round(dragon.hunger) + '% nourished).';
    record(site, world, msg);
    return { ok: true, dragon, foodStock: ds.foodStock, message: msg };
  }

  /**
   * Periodic simulation tick (called weekly and on live ticks):
   * - Dragons get hungrier regularly.
   * - Assigned Dragon Stable workers automatically replenish food in the stable
   *   and feed hungry dragons!
   */
  function tick(world, site, dtWeeks = 1) {
    if (!hasStable(site)) return [];
    const ds = ensure(site);
    const notes = [];

    // 1. Dragons expend nourishment over time
    for (const d of ds.dragons) {
      d.hunger = clamp(d.hunger - Math.round(18 * dtWeeks), 0, 100);
      d.firePower = clamp((d.firePower ?? 100) + Math.round(15 * dtWeeks), 0, 100);
    }

    // 2. Stable workers replenish the larder regularly & feed hungry dragons
    if (ds.workers.length > 0) {
      const targetStock = Math.min(LARDER_MAX, 8 + ds.dragons.length * 4);
      let replenishedTotal = 0;
      for (const w of ds.workers) {
        if (ds.foodStock < targetStock) {
          const needed = Math.min(4, targetStock - ds.foodStock);
          // Workers draw from community food or gather coastal fish/forage if stores are low
          const fromStores = Math.min(needed, Math.max(0, (site.food || 0) - 2));
          const foraged = needed - fromStores > 0 ? Math.min(2, needed - fromStores) : 0;
          site.food = Math.max(0, (site.food || 0) - fromStores);
          const added = fromStores + foraged;
          ds.foodStock = Math.min(LARDER_MAX, ds.foodStock + added);
          w.mealsReplenished = (w.mealsReplenished || 0) + added;
          replenishedTotal += added;
        }
      }
      if (replenishedTotal > 0) {
        const keeperNames = ds.workers.map(w => w.name).join(' and ');
        const note = keeperNames + ' replenished the Dragon Stable larder with ' + replenishedTotal + ' fresh rations.';
        notes.push(note);
        record(site, world, note);
      }

      // Workers automatically feed any dragon below 70% nourishment
      for (const d of ds.dragons) {
        if (d.hunger < 70 && ds.foodStock >= FEED_FOOD_COST) {
          const keeper = ds.workers[0];
          const res = feedDragon(world, site, d.id, keeper.name);
          if (res.ok) notes.push(res.message);
        }
      }
    } else if (ds.dragons.some(d => d.hunger < 35)) {
      const hungry = ds.dragons.filter(d => d.hunger < 35).map(d => d.name).join(', ');
      notes.push(hungry + ' is hungry at the Dragon Stable. Assign stable workers to keep the larder stocked.');
    }

    // 3. Autonomous Homeland Defense — Dragons act instinctively on their own free will
    //    WITHOUT needing a Wizard rider whenever Giant Trolls or enemy intruders threaten their community!
    const autoDefense = autonomousDefend(world, site, { dtWeeks });
    for (const note of autoDefense.messages) notes.push(note);

    return notes;
  }

  // Runtime autonomous flight & combat state for 2D Street View (WeakMap keeps save JSON 100% clean)
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
   * Scans ALL active threats encroaching on or attacking `site`.
   * Strictly defensive homeland scan — NEVER targets peaceful or foreign communities' lands.
   */
  function findHomelandThreats(world, site, sceneContext = {}) {
    if (!site) return [];
    const threats = [];

    // 1. Giant Trolls marching on or attacking this community (intercept aggressively up to ~1.25 km out!)
    const localTrolls = (world && root.EarthGiantTrolls?.trollsForSite)
      ? root.EarthGiantTrolls.trollsForSite(world, site.id)
      : [];
    for (const t of localTrolls) {
      if (!t || t.state === 'slain' || t.hp <= 0) continue;
      const km = root.EarthGiantTrolls?.distanceKm?.(t) ?? t.distanceKm ?? 0;
      if (km <= 1.25 || t.state !== 'approaching') {
        threats.push({
          id: t.id,
          kind: 'troll',
          isTroll: true,
          name: t.name,
          x: Number.isFinite(t.x) ? t.x : 12,
          y: Number.isFinite(t.y) ? t.y : 12,
          hp: t.hp,
          maxHp: t.maxHp,
          km,
          priority: (t.state !== 'approaching' ? 0 : 25) + km * 30,
          ref: t
        });
      }
    }

    // 2. Hostile street border encounter actively fighting in this community
    const streetFight = site.communityLife?.border?.street;
    if (streetFight && streetFight.phase === 'fight') {
      const gx = Number.isFinite(sceneContext?.pursuit?.x) ? sceneContext.pursuit.x : 12;
      const gy = Number.isFinite(sceneContext?.pursuit?.y) ? sceneContext.pursuit.y : 12;
      threats.push({
        id: 'border-street-' + (streetFight.guard?.key || 'raider'),
        kind: 'borderStreet',
        isTroll: false,
        name: streetFight.guard?.name || 'Hostile Border Intruder',
        x: gx,
        y: gy,
        hp: streetFight.hp ?? 100,
        maxHp: 100,
        km: 0,
        priority: 2,
        ref: streetFight
      });
    }

    // 3. Rival war campaigns actively marching on or fighting at this community
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
          const distUnits = camp.phase === 'fight' ? 6 : 14 + (1 - prog) * 28;
          threats.push({
            id: 'campaign-' + other.id,
            kind: 'campaign',
            isTroll: false,
            name: (other.name || 'Hostile') + ' War Party',
            x: 12 + Math.cos(camp.seed || 1.2) * distUnits,
            y: Math.max(-18, 12 - Math.abs(Math.sin(camp.seed || 1.2)) * distUnits),
            hp: Math.max(40, (camp.strength || 1) * 45),
            maxHp: Math.max(40, (camp.initial || camp.strength || 1) * 45),
            km: Number((distUnits * 0.013).toFixed(2)),
            priority: camp.phase === 'fight' ? 4 : 18,
            attackerSite: other,
            ref: camp
          });
        }
      }
    }

    // 4. Live hostile enemy units / soldiers / trucks passed in from Street View or Field
    if (Array.isArray(sceneContext?.enemies)) {
      for (const en of sceneContext.enemies) {
        if (!en || en.dead || !Number.isFinite(en.x) || !Number.isFinite(en.y)) continue;
        // Strictly ignore anything that explicitly belongs to a foreign community's own land (not intruding here)
        if (en.foreignLand === true) continue;
        threats.push({
          id: en.id || ('enemy-' + threats.length),
          kind: en.kind || 'intruder',
          isTroll: Boolean(en.isTroll),
          name: en.name || 'Enemy Intruder',
          x: en.x,
          y: en.y,
          hp: en.hp ?? 100,
          maxHp: en.maxHp ?? 100,
          km: Math.hypot(en.x - 12, en.y - 12) * 0.013,
          priority: 3 + Math.hypot(en.x - 12, en.y - 12) * 0.25,
          ref: en
        });
      }
    }

    threats.sort((a, b) => a.priority - b.priority);
    return threats;
  }

  function wallBoundsForSite(site) {
    const lvl = site?.territoryLevel || 0;
    const hasWater = Boolean(site?.water || site?.coastal || root.CommonEarthSim?.waterfront?.(site));
    if (root.EarthFlightPhysics?.communityWallBounds2D) {
      return root.EarthFlightPhysics.communityWallBounds2D(lvl, hasWater, 0.85);
    }
    const expand = Math.max(0, Math.floor(Number(lvl) || 0)) * 6;
    return {
      minX: -6.65 - expand,
      maxX: 26.65 + expand,
      minY: -6.65 - expand,
      maxY: (hasWater ? 25.15 : 27.5 + expand) - 0.85,
      wallMinX: -7.5 - expand,
      wallMaxX: 27.5 + expand,
      wallMinY: -7.5 - expand,
      wallMaxY: hasWater ? 25.15 : 27.5 + expand,
      hasWaterfront: hasWater
    };
  }

  function distanceOutsideWalls(x, y, walls) {
    const cx = clamp(x, walls.minX, walls.maxX);
    const cy = clamp(y, walls.minY, walls.maxY);
    return Math.hypot(x - cx, y - cy);
  }

  /**
   * Weekly / Simulation-Turn Autonomous Dragon Homeland Defense (NO WIZARD REQUIRED).
   * Every dragon spiritually bound to `site` stays strictly inside the community walls
   * and aggressively blasts Giant Trolls and enemy intruders that reach or breach the walls.
   */
  function autonomousDefend(world, site, options = {}) {
    const out = { defended: false, blasts: 0, trollsSlain: 0, campaignsRouted: 0, messages: [] };
    if (!world || !site || !hasStable(site)) return out;
    const ds = ensure(site);
    const defenders = ds.dragons.filter(d => d && (!d.homeSiteId || d.homeSiteId === site.id));
    if (!defenders.length) return out;

    const walls = wallBoundsForSite(site);
    const inWallRange = th => th.kind === 'borderStreet' || th.kind === 'campaign' || th.ref?.state !== 'approaching' || distanceOutsideWalls(th.x, th.y, walls) <= 9.2;
    const threats = findHomelandThreats(world, site, options.sceneContext).filter(inWallRange);
    if (!threats.length) return out;

    const week = world.week || 1;
    for (let i = 0; i < defenders.length; i++) {
      const dragon = defenders[i];
      const liveThreats = findHomelandThreats(world, site, options.sceneContext).filter(inWallRange);
      if (!liveThreats.length) break;

      // Distribute across threats while focusing the highest-priority breach first
      const target = liveThreats[i % liveThreats.length] || liveThreats[0];
      const lineage = LINEAGES.find(l => l.id === dragon.lineage);
      const speedBonus = lineage?.speedBonus || 1.06;
      const hungerFactor = dragon.hunger > 15 ? 1.0 : 0.78; // Adrenaline lets even hungry dragons fiercely defend home!

      dragon.hunger = clamp(dragon.hunger - 3, 0, 100);
      dragon.blasts = (dragon.blasts || 0) + 1;
      dragon.autonomousBlasts = (dragon.autonomousBlasts || 0) + 1;
      ds.defenses = (ds.defenses || 0) + 1;
      ds.autonomousDefenses = (ds.autonomousDefenses || 0) + 1;
      out.defended = true;
      out.blasts++;

      if (target.kind === 'troll' && root.EarthGiantTrolls) {
        // Relentless multi-pass autonomous fire volley during the turn (115–145 raw -> 190–240 damage after 1.65x multiplier!)
        const rawDmg = Math.round((115 + (speedBonus - 1) * 200) * hungerFactor);
        const res = root.EarthGiantTrolls.attackTroll(world, site, target.id, {
          source: 'dragonFire',
          damage: rawDmg,
          dragonName: dragon.name,
          autonomous: true
        });
        if (res?.ok) {
          if (res.killed) {
            dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
            out.trollsSlain++;
          }
          record(site, world, res.message);
          out.messages.push(res.message);
        }
      } else if (target.kind === 'campaign' && target.ref) {
        const camp = target.ref;
        const loss = Math.max(2, Math.ceil((camp.strength || 2) * 0.55));
        camp.strength = Math.max(0, (camp.strength || 0) - loss);
        camp.casualties = (camp.casualties || 0) + loss;
        const routed = camp.strength <= 1;
        if (routed) {
          camp.phase = 'return';
          camp.progress = Math.max(0.15, 1 - (camp.progress || 0.5));
          camp.outcome = 'burned back by ' + site.name + '\'s guardian dragons';
          dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
          out.campaignsRouted++;
        }
        site.wellbeing = clamp((site.wellbeing || 50) + 1, 0, 100);
        const msg = routed
          ? dragon.name + ' instinctively scrambled without a rider and incinerated the ' + target.name + ' with blazing dragonfire, routing them from ' + site.name + '!'
          : dragon.name + ' acted on its own free will, swooping down to scorch the encroaching ' + target.name + ' (-' + loss + ' hostile fighters) defending ' + site.name + '!';
        record(site, world, msg);
        out.messages.push(msg);
      } else if (target.kind === 'borderStreet' && target.ref) {
        const sf = target.ref;
        sf.phase = 'repelled';
        sf.hp = 0;
        if (site.communityLife?.border) delete site.communityLife.border.street;
        dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
        const msg = dragon.name + ' instinctively dove from the skies and drove off ' + target.name + ' with a ferocious blast of dragonfire!';
        record(site, world, msg);
        out.messages.push(msg);
      } else {
        const msg = dragon.name + ' instinctively intercepted ' + target.name + ' at ' + site.name + '\'s perimeter and unleashed blazing dragonfire!';
        record(site, world, msg);
        out.messages.push(msg);
      }
    }

    if (out.defended) {
      ds.lastDefenseWeek = week;
    }
    return out;
  }

  /**
   * Real-Time Continuous Autonomous Dragon Defender AI (2D Street View & Unit-Testable in Node).
   * Dragons fly on their own agency — ZERO Wizard needed — immediately scrambling whenever
   * Giant Trolls or hostile intruders approach or enter the community, pursuing them aggressively,
   * circling overhead, and blasting continuous roaring dragonfire until every enemy is destroyed.
   */
  function stepAutonomousDefenders(world, site, dt = 0.016, sceneContext = {}) {
    const empty = { poses: [], events: [], defendingCount: 0 };
    if (!site || !hasStable(site)) return empty;
    const ds = ensure(site);
    const defenders = ds.dragons.filter(d => d && (!d.homeSiteId || d.homeSiteId === site.id));
    if (!defenders.length) return empty;

    const stable = stableLocation(site) || { x: 12, y: 12 };
    const walls = wallBoundsForSite(site);
    const step = clamp(dt || 0.016, 0.001, 0.25);
    const visualTime = Number.isFinite(sceneContext.time) ? sceneContext.time : ((site._dragonClock || 0) + step);
    site._dragonClock = visualTime;

    const map = getRuntimeMap(site);
    const threats = findHomelandThreats(world, site, sceneContext);
    const events = [];
    const poses = [];
    let defendingCount = 0;
    const TILT = 0.51;

    for (let i = 0; i < defenders.length; i++) {
      const dragon = defenders[i];
      const lineage = LINEAGES.find(l => l.id === dragon.lineage);
      const speedBonus = lineage?.speedBonus || 1.06;
      const ring = i % 3;

      let st = map.get(dragon.id);
      if (!st) {
        const initT = visualTime * (0.38 + ring * 0.07) + i * 2.1;
        const rx = 5.2 + ring * 2.2;
        const ry = 4.6 + ring * 2.0;
        st = {
          x: clamp(stable.x + Math.cos(initT) * rx, walls.minX, walls.maxX),
          y: clamp(stable.y + Math.sin(initT) * ry, walls.minY, walls.maxY),
          z: (3.2 + ring * 0.9) * 0.62,
          angle: 0,
          orbitAngle: i * 2.05,
          fireTimer: 0,
          fireCooldown: 0.15 + (i % 3) * 0.18,
          state: 'patrol',
          targetId: null,
          targetKind: null,
          targetName: null,
          fireTarget: null,
          announcedTargetId: null
        };
        map.set(dragon.id, st);
      }

      if (st.fireTimer > 0) st.fireTimer = Math.max(0, st.fireTimer - step);
      if (st.fireCooldown > 0) st.fireCooldown = Math.max(0, st.fireCooldown - step);

      // Re-scan active threats (an earlier dragon in this same step may have just slain one!)
      const activeThreats = threats.filter(th => {
        if (th.kind === 'troll') return th.ref && th.ref.state !== 'slain' && th.ref.hp > 0;
        if (th.kind === 'campaign') return th.ref && th.ref.phase !== 'return' && (th.ref.strength || 0) > 0;
        if (th.kind === 'borderStreet') return site.communityLife?.border?.street?.phase === 'fight';
        return !th.ref?.dead && (th.ref?.hp == null || th.ref.hp > 0);
      });

      if (activeThreats.length > 0) {
        defendingCount++;
        // Prioritize threats already inside or at the community walls; spread dragons across threats
        const nearWallThreats = activeThreats.filter(th => distanceOutsideWalls(th.x, th.y, walls) <= 9.2 || th.kind === 'borderStreet');
        const pool = nearWallThreats.length ? nearWallThreats : activeThreats;
        let target = pool.find(th => th.id === st.targetId) || pool[i % pool.length] || pool[0];
        st.targetId = target.id;
        st.targetKind = target.kind;
        st.targetName = target.name;

        const tx = target.x;
        const ty = target.y;
        // Dragons NEVER fly outside the community perimeter walls: clamp flight destination inside walls!
        const wallAnchorX = clamp(tx, walls.minX, walls.maxX);
        const wallAnchorY = clamp(ty, walls.minY, walls.maxY);
        const targetOutsideWalls = Math.hypot(tx - wallAnchorX, ty - wallAnchorY) > 0.05;

        const dxToAnchor = wallAnchorX - st.x;
        const dyToAnchor = wallAnchorY - st.y;
        const distToAnchor = Math.hypot(dxToAnchor, dyToAnchor);
        const distToTarget = Math.hypot(tx - st.x, ty - st.y);

        const attackRange = target.kind === 'troll' ? 9.2 : 7.4;
        const orbitRadius = target.kind === 'troll' ? 3.4 + (i % 2) * 1.0 : 3.0 + (i % 2) * 0.8;
        const swoopSpeed = 14.5 * speedBonus;

        if (st.announcedTargetId !== target.id && distToTarget <= attackRange + 6) {
          st.announcedTargetId = target.id;
          events.push({
            type: 'dragonIntercept',
            dragon,
            target,
            x: st.x,
            y: st.y,
            tx,
            ty,
            message: dragon.name + ' took position along ' + site.name + '\'s inner walls to incinerate ' + target.name + '!'
          });
        }

        let moveDx = 0;
        let moveDy = 0;
        const canFireFromWalls = distToTarget <= attackRange;

        if (!canFireFromWalls) {
          // Swoop strictly INSIDE the walls to the inner wall parapet nearest the incoming threat & wait on guard
          st.state = distToAnchor > 2.2 ? 'intercept' : 'guard';
          const guardSpread = ((i % 5) - 2) * 2.1;
          const guardX = clamp(wallAnchorX + (Math.abs(wallAnchorY - walls.minY) < 1.5 || Math.abs(wallAnchorY - walls.maxY) < 1.5 ? guardSpread : 0), walls.minX, walls.maxX);
          const guardY = clamp(wallAnchorY + (Math.abs(wallAnchorX - walls.minX) < 1.5 || Math.abs(wallAnchorX - walls.maxX) < 1.5 ? guardSpread : 0), walls.minY, walls.maxY);
          const gx = guardX - st.x;
          const gy = guardY - st.y;
          const gDist = Math.hypot(gx, gy);
          if (gDist > 0.35) {
            const stepDist = Math.min(gDist, swoopSpeed * step);
            st.x += (gx / gDist) * stepDist;
            st.y += (gy / gDist) * stepDist;
            moveDx = gx / gDist;
            moveDy = gy / gDist;
          } else {
            // Hover on alert along the inner wall facing outward toward the approaching threat
            st.orbitAngle += 1.4 * step;
            st.x = clamp(guardX + Math.cos(st.orbitAngle) * 0.65, walls.minX, walls.maxX);
            st.y = clamp(guardY + Math.sin(st.orbitAngle) * 0.65, walls.minY, walls.maxY);
            moveDx = tx - st.x;
            moveDy = ty - st.y;
          }
          st.z += ((2.65 + Math.sin(visualTime * 3.0 + i) * 0.25) - st.z) * Math.min(1, step * 4.2);
        } else {
          // AGGRESSIVE COMBAT ORBIT (STRICTLY INSIDE WALLS) & CONTINUOUS DRAGONFIRE ASSAULT!
          st.state = 'attack';
          const orbitSpeed = (2.15 + (i % 2) * 0.35) * (i % 2 === 0 ? 1 : -1);
          st.orbitAngle += orbitSpeed * step;
          const rawDesiredX = (targetOutsideWalls ? wallAnchorX : tx) + Math.cos(st.orbitAngle) * (targetOutsideWalls ? 1.8 : orbitRadius);
          const rawDesiredY = (targetOutsideWalls ? wallAnchorY : ty) + Math.sin(st.orbitAngle) * (targetOutsideWalls ? 1.8 : orbitRadius);
          const desiredX = clamp(rawDesiredX, walls.minX, walls.maxX);
          const desiredY = clamp(rawDesiredY, walls.minY, walls.maxY);
          const pull = Math.min(1, step * 6.5);
          const prevX = st.x;
          const prevY = st.y;
          st.x = clamp(st.x + (desiredX - st.x) * pull, walls.minX, walls.maxX);
          st.y = clamp(st.y + (desiredY - st.y) * pull, walls.minY, walls.maxY);
          st.z += ((2.15 + Math.sin(visualTime * 4.5 + i) * 0.25) - st.z) * Math.min(1, step * 5.0);
          moveDx = st.x - prevX;
          moveDy = st.y - prevY;

          // Unleash blazing dragonfire relentlessly every 0.92s while enemy is within wall fire range!
          if (st.fireCooldown <= 0) {
            st.fireCooldown = 0.92;
            st.fireTimer = 0.62;
            st.fireTarget = { x: tx, y: ty, name: target.name, id: target.id };

            const hungerFactor = dragon.hunger > 15 ? 1.0 : 0.78;
            dragon.hunger = clamp(dragon.hunger - 1.5, 0, 100);
            dragon.blasts = (dragon.blasts || 0) + 1;
            dragon.autonomousBlasts = (dragon.autonomousBlasts || 0) + 1;
            ds.defenses = (ds.defenses || 0) + 1;
            ds.autonomousDefenses = (ds.autonomousDefenses || 0) + 1;

            let dealt = 0;
            let killed = false;
            let msg = '';

            if (target.kind === 'troll' && root.EarthGiantTrolls) {
              const rawDmg = Math.round(78 * speedBonus * hungerFactor);
              const hit = root.EarthGiantTrolls.attackTroll(world, site, target.id, {
                source: 'dragonFire',
                damage: rawDmg,
                dragonName: dragon.name,
                autonomous: true
              });
              if (hit?.ok) {
                dealt = hit.dealt;
                killed = Boolean(hit.killed);
                msg = hit.message;
                if (killed) {
                  dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
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
                camp.outcome = 'incinerated and routed by ' + dragon.name;
                killed = true;
                dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
                st.targetId = null;
                st.announcedTargetId = null;
              }
              msg = killed
                ? dragon.name + ' autonomously torched and routed the ' + target.name + '!'
                : dragon.name + ' blasted fire onto the ' + target.name + ' (-' + loss + ' hostile fighters)!';
              if (killed) record(site, world, msg);
            } else if (target.kind === 'borderStreet' && target.ref) {
              const sf = target.ref;
              sf.hp = Math.max(0, (sf.hp ?? 100) - 55);
              dealt = 55;
              if (sf.hp <= 0) {
                sf.phase = 'repelled';
                if (site.communityLife?.border) delete site.communityLife.border.street;
                killed = true;
                dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
                st.targetId = null;
                st.announcedTargetId = null;
              }
              msg = killed
                ? dragon.name + ' autonomously scorched and drove off ' + target.name + '!'
                : dragon.name + ' blasted ' + target.name + ' with protective dragonfire (-55 HP)!';
              if (killed) record(site, world, msg);
            } else {
              dealt = Math.round(95 * speedBonus * hungerFactor);
              const res = sceneContext.onEnemyHit?.(target, dealt, dragon);
              killed = Boolean(res?.killed);
              if (killed) {
                dragon.autonomousKills = (dragon.autonomousKills || 0) + 1;
                st.targetId = null;
                st.announcedTargetId = null;
              }
              msg = res?.message || (
                killed
                  ? dragon.name + ' autonomously incinerated ' + target.name + ' defending ' + site.name + '!'
                  : dragon.name + ' blasted ' + target.name + ' with autonomous dragonfire (-' + dealt + ' HP)!'
              );
              if (killed) record(site, world, msg);
            }

            events.push({
              type: 'dragonFire',
              dragon,
              target,
              x: st.x,
              y: st.y,
              z: st.z,
              tx,
              ty,
              dealt,
              killed,
              message: msg
            });
          }
        }

        // Aim dragon head straight at the target while blasting or swooping!
        const aimDx = st.state === 'attack' ? (tx - st.x) : moveDx;
        const aimDy = st.state === 'attack' ? (ty - st.y) : moveDy;
        if (Math.hypot(aimDx, aimDy) > 0.001) {
          st.angle = Math.atan2((aimDx + aimDy) * TILT, aimDx - aimDy);
        }
        if (st.fireTimer > 0) {
          st.fireTarget = { x: tx, y: ty, name: target.name, id: target.id };
        }
      } else {
        // Peaceful sanctuary patrol strictly INSIDE the community walls when homeland is safe
        st.state = 'patrol';
        st.targetId = null;
        st.targetKind = null;
        st.targetName = null;
        st.announcedTargetId = null;
        st.fireTarget = null;
        const patrolT = visualTime * (0.38 + ring * 0.07) + i * 2.1;
        const rx = 6.5 + ring * 2.6;
        const ry = 5.5 + ring * 2.2;
        const patrolCenterX = clamp(12, walls.minX + 3, walls.maxX - 3);
        const patrolCenterY = clamp(12, walls.minY + 3, walls.maxY - 3);
        const goalX = clamp(patrolCenterX + Math.cos(patrolT) * rx, walls.minX, walls.maxX);
        const goalY = clamp(patrolCenterY + Math.sin(patrolT) * ry, walls.minY, walls.maxY);
        const goalZ = (3.2 + ring * 0.9 + Math.sin(patrolT * 1.6) * 0.55) * 0.62;
        const prevX = st.x;
        const prevY = st.y;
        const blend = Math.min(1, step * 3.2);
        st.x = clamp(st.x + (goalX - st.x) * blend, walls.minX, walls.maxX);
        st.y = clamp(st.y + (goalY - st.y) * blend, walls.minY, walls.maxY);
        st.z += (goalZ - st.z) * blend;
        const dx = Math.hypot(st.x - prevX, st.y - prevY) > 0.002 ? (st.x - prevX) : (-Math.sin(patrolT) * rx);
        const dy = Math.hypot(st.x - prevX, st.y - prevY) > 0.002 ? (st.y - prevY) : (Math.cos(patrolT) * ry);
        st.angle = Math.atan2((dx + dy) * TILT, dx - dy);
      }

      // Final hard invariant: dragons may NEVER leave the walls of the community
      st.x = clamp(st.x, walls.minX, walls.maxX);
      st.y = clamp(st.y, walls.minY, walls.maxY);

      poses.push({
        dragon,
        x: st.x,
        y: st.y,
        z: st.z,
        angle: st.angle,
        size: st.state !== 'patrol' ? 1.08 : 0.95,
        depth: st.x + st.y + 9.5,
        state: st.state,
        defending: st.state !== 'patrol',
        breathingFire: st.fireTimer > 0,
        fireTarget: st.fireTimer > 0 ? st.fireTarget : null,
        targetName: st.targetName
      });
    }

    return { poses, events, defendingCount };
  }

  function getAutonomousPoses(site) {
    if (!site || !hasStable(site)) return [];
    const ds = ensure(site);
    const map = runtimeState.get(site);
    if (!map || !map.size) return [];
    const poses = [];
    for (const dragon of ds.dragons) {
      const st = map.get(dragon.id);
      if (!st) continue;
      poses.push({
        dragon,
        x: st.x,
        y: st.y,
        z: st.z,
        angle: st.angle,
        size: st.state !== 'patrol' ? 1.08 : 0.95,
        depth: st.x + st.y + 9.5,
        state: st.state,
        defending: st.state !== 'patrol',
        breathingFire: st.fireTimer > 0,
        fireTarget: st.fireTimer > 0 ? st.fireTarget : null,
        targetName: st.targetName
      });
    }
    return poses;
  }

  /**
   * Enchanted Dragonfire — Strictly Spiritual Sky-Joy OR Protective Homeland Defense!
   * Dragons are deeply spiritual beings bound to the soul of their home land:
   * - They NEVER participate in offensive war or attack foreign communities/buildings.
   * - They unleash joyful fire arcs in the sky (`kind: 'fun'`) and defend their own
   *   homeland against encroaching invaders (`kind: 'defense'` / `defensive: true`).
   */
  function blastFire(world, site, actorId, dragonId, target = { kind: 'fun' }) {
    const check = canFlyDragon(site, actorId, dragonId);
    if (!check.ok) return { ok: false, message: check.reason };
    const power = wizardPowerStatus(world, site, actorId);
    if (!power.fullPower) return { ok: false, restricted: true, message: power.reason };

    const ds = ensure(site);
    const { dragon, wizard } = check;
    const kind = target?.kind || 'fun';

    // Refuse crossing into another community's lands
    if (target?.siteId && target.siteId !== site.id) {
      const borderCheck = canEnterCommunity(site, dragon, target.siteId);
      return { ok: false, refused: true, message: borderCheck.reason };
    }

    if (kind === 'fun') {
      dragon.hunger = clamp(dragon.hunger - 4, 0, 100);
      dragon.blasts = (dragon.blasts || 0) + 1;
      ds.funBlasts = (ds.funBlasts || 0) + 1;
      site.wellbeing = clamp((site.wellbeing || 50) + 1, 0, 100);
      const msg = wizard.name + ' and ' + dragon.name + ' unleashed a luminous arc of spiritual dragonfire across the skies of ' + site.name + '!';
      record(site, world, msg);
      return { ok: true, kind: 'fun', dragon, wizard, message: msg };
    }

    // Only allow protective homeland defense against active invaders/intruders or invading Giant Trolls
    const isTroll = Boolean(target?.isTroll || target?.trollId || kind === 'troll');
    const isDefensive = isTroll || kind === 'defense' || Boolean(target?.defensive || target?.intruder);
    if (!isDefensive || kind === 'building') {
      const msg = dragon.name + ' is a deeply spiritual protector bound to the soul of ' + site.name + ' and refuses to participate in offensive war.';
      return { ok: false, refused: true, message: msg };
    }

    dragon.hunger = clamp(dragon.hunger - 6, 0, 100);
    dragon.blasts = (dragon.blasts || 0) + 1;
    ds.defenses = (ds.defenses || 0) + 1;
    if (isTroll && root.EarthGiantTrolls) {
      const trollHit = root.EarthGiantTrolls.attackTroll(world, site, target?.trollId || target?.id, {
        source: 'dragonFire',
        damage: target?.damage,
        dragonName: dragon.name,
        wizardName: wizard.name
      });
      if (trollHit?.ok) {
        record(site, world, trollHit.message);
        return { ok: true, kind: 'defense', isTroll: true, trollResult: trollHit, dragon, wizard, message: trollHit.message };
      }
    }
    const targetName = target.name || 'encroaching invaders';
    const msg = wizard.name + ' and ' + dragon.name + ' defended ' + site.name + ', repelling ' + targetName + ' with protective dragonfire!';
    record(site, world, msg);
    return { ok: true, kind: 'defense', dragon, wizard, message: msg };
  }

  /**
   * Wizard Staff Sky-to-Ground Thunder Strike — Protective Homeland Measure Only!
   * - Requires the Wizard to be in their originating community (full spiritual resonance).
   * - Channels lightning skyward from the Wizard's staff and crashes down to repel
   *   active invaders or reinforce the protective perimeter ward of their home land.
   * - Refuses offensive strikes against other communities.
   */
  function strikeThunder(world, site, actorId, dragonId, target = {}) {
    const power = wizardPowerStatus(world, site, actorId);
    if (!power.isWizard) return { ok: false, message: power.reason };
    if (!power.fullPower) return { ok: false, restricted: true, message: power.reason };

    const ds = ensure(site);
    const wizard = power.wizard;
    const dragon = dragonId ? ds.dragons.find(d => d.id === dragonId) : ds.dragons[0];

    if (target?.siteId && target.siteId !== site.id) {
      return {
        ok: false,
        refused: true,
        message: wizard.name + '\'s protective staff thunder is bound to the soul of ' + site.name + ' and will not strike another community in offensive war.'
      };
    }
    if (target?.offensive === true || target?.kind === 'building') {
      return {
        ok: false,
        refused: true,
        message: 'Staff thunder is a sacred protective measure for defending ' + site.name + ', never an instrument of offensive war.'
      };
    }

    wizard.thunderStrikes = (wizard.thunderStrikes || 0) + 1;
    ds.thunderStrikes = (ds.thunderStrikes || 0) + 1;
    ds.defenses = (ds.defenses || 0) + 1;
    site.wellbeing = clamp((site.wellbeing || 50) + 1, 0, 100);

    // If colossal Giant Trolls are currently besieging our homeland, protective staff thunder smites them!
    const localTrolls = root.EarthGiantTrolls?.trollsForSite?.(world, site.id) || [];
    const targetTrollId = target?.trollId || (target?.isTroll ? target.id : null) || localTrolls[0]?.id;
    if (targetTrollId && root.EarthGiantTrolls && (target?.isTroll || target?.kind === 'troll' || localTrolls.length > 0)) {
      const trollHit = root.EarthGiantTrolls.attackTroll(world, site, targetTrollId, {
        source: 'wizardThunder',
        damage: target?.damage,
        dragonName: dragon?.name,
        wizardName: wizard.name
      });
      if (trollHit?.ok) {
        record(site, world, trollHit.message);
        return { ok: true, kind: 'defense', isTroll: true, trollResult: trollHit, dragon, wizard, message: trollHit.message };
      }
    }

    const repelledName = target?.intruder && target?.name
      ? target.name
      : 'the perimeter of ' + site.name;
    const msg = target?.intruder
      ? wizard.name + ' raised the arcane staff to the sky and called down protective thunder to repel ' + repelledName + ' from ' + site.name + '!'
      : wizard.name + ' raised the arcane staff skyward and called down a protective thunder ward safeguarding ' + site.name + '!';
    record(site, world, msg);
    return { ok: true, kind: 'defense', dragon, wizard, message: msg };
  }

  function recordFlight(world, site, actorId, dragonId, stats = {}) {
    const ds = ensure(site);
    if (!ds) return;
    const dragon = ds.dragons.find(d => d.id === dragonId);
    const wizard = ds.wizards.find(w => w.id === actorId || w.residentId === actorId);
    if (dragon) {
      dragon.flights = (dragon.flights || 0) + 1;
      dragon.hunger = clamp(dragon.hunger - clamp(Math.round((stats.distanceFlown || 0) / 140), 2, 16), 0, 100);
    }
    if (wizard) wizard.flights = (wizard.flights || 0) + 1;
  }

  function valid(siteOrStable) {
    if (siteOrStable == null) return true;
    const ds = (typeof siteOrStable === 'object' && !Array.isArray(siteOrStable) && Array.isArray(siteOrStable.dragons))
      ? siteOrStable
      : siteOrStable?.dragonStable;
    if (ds == null) return true;
    if (typeof ds !== 'object' || Array.isArray(ds)) return false;
    if (!Array.isArray(ds.dragons) || !Array.isArray(ds.wizards) || !Array.isArray(ds.workers)) return false;
    if (!Number.isFinite(ds.foodStock) || ds.foodStock < 0 || ds.foodStock > LARDER_MAX * 2) return false;
    return ds.dragons.every(d => d && typeof d.id === 'string' && typeof d.name === 'string' && Number.isFinite(d.hunger)) &&
      ds.wizards.every(w => w && typeof w.id === 'string' && typeof w.name === 'string') &&
      ds.workers.every(w => w && typeof w.id === 'string' && typeof w.name === 'string');
  }

  const api = Object.freeze({
    LINEAGES,
    LARDER_MAX,
    DRAGON_COST,
    WIZARD_COST,
    hasStable,
    stableLocation,
    wallBoundsForSite,
    ensure,
    isWizard,
    wizardPowerStatus,
    canEnterCommunity,
    canFlyDragon,
    findHomelandThreats,
    autonomousDefend,
    stepAutonomousDefenders,
    getAutonomousPoses,
    trainWizard,
    createNewWizard,
    summonDragon,
    assignWorker,
    replenishLarder,
    feedDragon,
    tick,
    blastFire,
    strikeThunder,
    recordFlight,
    valid
  });

  root.EarthDragonStable = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
