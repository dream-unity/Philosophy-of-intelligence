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

    return notes;
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

  function valid(site) {
    const ds = site?.dragonStable;
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
    ensure,
    isWizard,
    wizardPowerStatus,
    canEnterCommunity,
    canFlyDragon,
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
