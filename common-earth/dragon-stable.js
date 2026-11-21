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

  // A dragon acquires this history only when released. Untouched saves keep their original residents.
  const activities = ['roam', 'forage', 'rest', 'return', 'home'];
  const directions = ['north', 'west', 'south', 'east'];
  function away(dragon) {
    return Boolean(dragon?.freedom && dragon.freedom.activity !== 'home');
  }

  function lifeDescription(dragon) {
    const life = dragon.freedom;
    if (!life) return 'Living at the stable';
    if (life.activity === 'home') return 'Home by choice · free to leave again';
    if (life.activity === 'return') return 'Flying back to the stable by choice';
    const action = {roam:'Exploring', forage:'Foraging', rest:'Resting'}[life.activity];
    return action + ' in the wild, ' + directions[life.range] + ' of town';
  }

  // The saved stream gives each dragon its own successive decisions. Looking at one
  // or previewing a week cannot change what it chooses in the actual world.
  function drawChoice(life) {
    life.seed = (Math.imul(life.seed,1664525) + 1013904223) >>> 0;
    return life.seed / 4294967296;
  }

  const clockTime = world => root.EarthDayClock?.now(world) ?? Date.now();
  function wildPose(dragon, now) {
    const life = dragon.freedom;
    if (!away(dragon)) return null;
    const seconds = Math.max(0, (now - life.since) / 1000);
    const progress = Math.min(1, seconds / 12);
    const blend = progress * progress * (3 - 2 * progress);
    const phase = seconds * .23 + life.roaming * Math.PI * 2;
    const radius = {roam:4.5, forage:1.8, rest:.15, return:0}[life.activity];
    const x = life.fromX + (life.toX - life.fromX) * blend + blend * Math.cos(phase) * radius;
    const y = life.fromY + (life.toY - life.fromY) * blend + blend * Math.sin(phase) * radius;
    const dx = progress < 1 ? life.toX - life.fromX : -Math.sin(phase);
    const dy = progress < 1 ? life.toY - life.fromY : Math.cos(phase);
    const z = (life.activity === 'rest' ? .4 : life.activity === 'return' ? 1.2 : 3.2) * blend + (1-blend)*2.5;
    return {x,y,z,angle:Math.atan2((dx+dy)*.51,dx-dy)};
  }

  function chooseDestination(site, life, activity, from, now) {
    const stable = stableLocation(site);
    life.activity = activity;
    life.since = now;
    life.fromX = from.x; life.fromY = from.y;
    if (activity === 'return') {
      life.toX = stable.x; life.toY = stable.y;
    } else {
      life.range = Math.floor(drawChoice(life) * directions.length);
      const bounds = root.EarthFlightPhysics?.perimeterBounds(site.territoryLevel||0, false);
      const outer = 4 + 6*drawChoice(life), along = 3 + 18*drawChoice(life);
      const low = (bounds?.minX ?? -7.5) - outer, high = (bounds?.maxX ?? 27.5) + outer;
      life.toX = [along,low,along,high][life.range];
      life.toY = [low,along,high,along][life.range];
    }
  }

  function releaseDragon(world, site, dragonId) {
    const dragon = site?.dragonStable?.dragons?.find(d=>d.id === dragonId);
    if (!dragon) return {ok:false,message:'Choose a dragon living at this stable.'};
    if (away(dragon)) return {ok:false,message:dragon.name+' is already free.'};
    const from = stableLocation(site) || {x:12,y:12};
    if (!dragon.freedom) {
      let seed = 2166136261;
      for (const c of [site.id,dragon.id,dragon.name,dragon.raisedWeek].join('/')) {
        seed = Math.imul(seed ^ c.charCodeAt(0),16777619) >>> 0;
      }
      dragon.freedom = {seed};
      dragon.freedom.roaming = drawChoice(dragon.freedom);
    }
    const life = dragon.freedom;
    life.lastWeek = world.week;
    life.nextRound = (world.productionSerial || 0) + 4;
    life.excursions = 0;
    chooseDestination(site, life, 'roam', from, clockTime(world));
    const message = dragon.name+' left the stable to live freely in the wild.';
    record(site,world,message);
    return {ok:true,message};
  }

  function decideFreely(world, site, round) {
    const notes = [];
    for (const dragon of site.dragonStable?.dragons || []) {
      const life = dragon.freedom;
      if (!life) continue;
      const newWeek = world.week > life.lastWeek;
      if (!newWeek && (round < life.nextRound || life.activity === 'home')) continue;
      const now = clockTime(world);
      const from = wildPose(dragon,now);
      const stable = stableLocation(site);
      if (life.activity === 'return' && stable && !newWeek && now < life.since+12000) continue;
      let note;
      life.lastWeek = world.week;
      life.nextRound = round + 3 + Math.floor(drawChoice(life)*4);
      if (life.activity === 'return' && stable) {
        life.activity = 'home';
        note = dragon.name+' chose to settle back at the stable.';
      } else if (life.activity === 'home') {
        // Reconsider home at a week boundary, when the player is back from flight.
        if (stable && drawChoice(life) >= .07 + .28*life.roaming) continue;
        life.excursions = 0;
        chooseDestination(site,life,'roam',stable || {x:12,y:12},now);
        note = dragon.name+' chose to leave the stable and explore again.';
      } else {
        dragon.hunger = clamp(dragon.hunger + (life.activity === 'forage' ? 32 : -8),0,100);
        const lowFood = dragon.hunger < 42;
        const company = (site.dragonStable.workers?.length > 0 || dragon.flights > 0);
        const chanceHome = .05 + .20*(1-life.roaming) + (company ? .12 : 0) +
          (lowFood && site.dragonStable.foodStock > 0 ? .14 : 0);
        if (stable && life.excursions > 0 && drawChoice(life) < chanceHome) {
          chooseDestination(site,life,'return',from,now);
          life.nextRound = round+1;
          note = dragon.name+' chose to fly home '+(lowFood?'for a meal.':company?'for familiar company.':'to rest at the stable.');
        } else {
          const activity = lowFood ? 'forage' : ['roam','forage','rest'][Math.floor(drawChoice(life)*3)];
          chooseDestination(site,life,activity,from,now);
          life.excursions++;
        }
      }
      if (note) { record(site,world,note); notes.push(note); }
    }
    return notes;
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
    const dragon = dragonId ? ds.dragons.find(d => d.id === dragonId) : ds.dragons.find(d=>!away(d));
    if (!dragon) {
      return { ok: false, reason: 'Summon a dragon at the Dragon Stable before flying.' };
    }
    if (away(dragon)) return {ok:false,reason:dragon.name+' is free. '+lifeDescription(dragon)+'.'};
    if (!isWizard(site, actorId)) {
      return {
        ok: false,
        reason: 'Only a Wizard can fly a dragon. Train a Wizard at the Dragon Stable or switch to a Wizard first.'
      };
    }
    if (dragon.hunger <= 5) {
      return {
        ok: false,
        reason: dragon.name + ' is too hungry to take off. Feed ' + dragon.name + ' from the Dragon Stable larder first.'
      };
    }
    return { ok: true, dragon, wizard: ds.wizards.find(w => w.id === actorId || w.residentId === actorId) };
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
      trainedWeek: world?.week || 1,
      flights: 0,
      robeColor: ['#3b367d', '#24526e', '#5d2f6e', '#265c52'][ds.wizards.length % 4]
    };
    ds.wizards.push(wizard);
    const msg = name + ' was initiated as a Wizard (' + title + ') at the Dragon Stable and can now mount and fly dragons.';
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
      trainedWeek: world?.week || 1,
      flights: 0,
      robeColor: ['#3b367d', '#24526e', '#5d2f6e', '#265c52'][ds.wizards.length % 4],
      stableBorn: true
    };
    ds.wizards.push(wizard);
    const msg = name + ' joined the Dragon Stable as a trained ' + title + ' Wizard.';
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
    const msg = name + ' (' + lineage.title + ') hatched at the Dragon Stable, shimmering with enchanted scales.';
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
    if (away(dragon)) return {ok:false,message:dragon.name+' is finding food in the wild.'};
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
    if (!hasStable(site) && !site?.dragonStable?.dragons?.some(d=>d.freedom)) return [];
    const ds = ensure(site);
    const notes = decideFreely(world,site,world.productionSerial || 0);
    const residents = ds.dragons.filter(d=>!away(d));

    // 1. Dragons expend nourishment over time
    for (const d of residents) {
      d.hunger = clamp(d.hunger - Math.round(18 * dtWeeks), 0, 100);
      d.firePower = clamp((d.firePower ?? 100) + Math.round(15 * dtWeeks), 0, 100);
    }

    // 2. Stable workers replenish the larder regularly & feed hungry dragons
    if (ds.workers.length > 0 && residents.length) {
      const targetStock = Math.min(LARDER_MAX, 8 + residents.length * 4);
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
      for (const d of residents) {
        if (d.hunger < 70 && ds.foodStock >= FEED_FOOD_COST) {
          const keeper = ds.workers[0];
          const res = feedDragon(world, site, d.id, keeper.name);
          if (res.ok) notes.push(res.message);
        }
      }
    } else if (residents.some(d => d.hunger < 35)) {
      const hungry = residents.filter(d => d.hunger < 35).map(d => d.name).join(', ');
      notes.push(hungry + ' is hungry at the Dragon Stable. Assign stable workers to keep the larder stocked.');
    }

    return notes;
  }

  /**
   * Dragon Fire-Breath Attack OR Mid-Flight Joyful Fire Blast!
   * target = { kind: 'fun' | 'building' | 'enemy' | 'person' | 'unit', name?, id?, siteId?, x?, y? }
   */
  function blastFire(world, site, actorId, dragonId, target = { kind: 'fun' }) {
    const check = canFlyDragon(site, actorId, dragonId);
    if (!check.ok) return { ok: false, message: check.reason };
    const ds = ensure(site);
    const { dragon, wizard } = check;
    const kind = target?.kind || 'fun';

    dragon.hunger = clamp(dragon.hunger - (kind === 'fun' ? 4 : 8), 0, 100);
    dragon.blasts = (dragon.blasts || 0) + 1;

    if (kind === 'fun') {
      ds.funBlasts = (ds.funBlasts || 0) + 1;
      site.wellbeing = clamp((site.wellbeing || 50) + 1, 0, 100);
      const msg = wizard.name + ' and ' + dragon.name + ' unleashed a dazzling arc of enchanted dragonfire across the sky just for the joy of flight!';
      record(site, world, msg);
      return { ok: true, kind: 'fun', dragon, wizard, message: msg };
    }

    ds.attacks = (ds.attacks || 0) + 1;
    const targetName = target.name || (kind === 'building' ? 'a structure' : 'the target');

    if (kind === 'building') {
      const targetSite = (target.siteId && root.EarthCommunityLife?.lookup?.(world, target.siteId)) || site;
      let damagedLabel = targetName;
      // Can scorch/damage a building in targetSite
      const b = targetSite.buildings?.find(item => item.id === target.id || item.name === targetName);
      const fb = targetSite.freeBuildings?.find(item => item.id === target.id || item.name === targetName);
      const struct = b || fb;
      if (struct) {
        struct.hp = clamp((struct.hp ?? 100) - 45, 0, 100);
        struct.scorched = true;
        damagedLabel = struct.name || targetName;
        if (struct.hp <= 0) {
          if (b) targetSite.buildings = targetSite.buildings.filter(item => item !== b);
          if (fb) targetSite.freeBuildings = targetSite.freeBuildings.filter(item => item !== fb);
          damagedLabel += ' (destroyed by dragonfire!)';
        } else {
          damagedLabel += ' (scorched · ' + struct.hp + '% integrity)';
        }
      }
      ds.scorched.unshift({ week: world?.week || 1, x: target.x ?? 12, y: target.y ?? 12, label: damagedLabel });
      if (ds.scorched.length > 20) ds.scorched.length = 20;
      const msg = wizard.name + ' commanded ' + dragon.name + ' to blast enchanted fire onto ' + damagedLabel + '!';
      record(site, world, msg);
      return { ok: true, kind: 'building', dragon, wizard, damaged: damagedLabel, message: msg };
    }

    // Enemy / unit / person fire attack
    const targetSite = (target.siteId && root.EarthCommunityLife?.lookup?.(world, target.siteId)) || null;
    if (targetSite?.militaryBase?.units?.length) {
      const unit = targetSite.militaryBase.units.find(u => u.id === target.id) || targetSite.militaryBase.units[0];
      if (unit) {
        unit.hp = Math.max(0, (unit.hp || 100) - 60);
        if (unit.hp <= 0) {
          targetSite.militaryBase.units = targetSite.militaryBase.units.filter(u => u.id !== unit.id);
        }
      }
    }
    const msg = wizard.name + ' and ' + dragon.name + ' blasted a torrent of enchanted dragonfire onto ' + targetName + '!';
    record(site, world, msg);
    return { ok: true, kind, dragon, wizard, message: msg };
  }

  function recordFlight(world, site, actorId, dragonId, stats = {}) {
    const ds = ensure(site);
    if (!ds) return;
    const dragon = ds.dragons.find(d => d.id === dragonId);
    const wizard = ds.wizards.find(w => w.id === actorId || w.residentId === actorId);
    if (!dragon || away(dragon) || !wizard) return false;
    dragon.flights = (dragon.flights || 0) + 1;
    dragon.hunger = clamp(dragon.hunger - clamp(Math.round((stats.distanceFlown || 0) / 140), 2, 16), 0, 100);
    wizard.flights = (wizard.flights || 0) + 1;
    return true;
  }

  function validFreedom(life) {
    if (life === undefined) return true;
    return life && activities.includes(life.activity) && Number.isInteger(life.range) && life.range>=0 && life.range<4 &&
      Number.isInteger(life.seed) && life.seed>=0 && life.seed<=0xffffffff &&
      Number.isFinite(life.roaming) && life.roaming>=0 && life.roaming<1 &&
      [life.since,life.nextRound,life.lastWeek,life.excursions].every(n=>Number.isSafeInteger(n) && n>=0) &&
      [life.fromX,life.fromY,life.toX,life.toY].every(Number.isFinite);
  }

  function valid(site) {
    const ds = site?.dragonStable;
    if (ds == null) return true;
    if (typeof ds !== 'object' || Array.isArray(ds)) return false;
    const {dragons = [], wizards = [], workers = [], foodStock = 12} = ds;
    if (![dragons,wizards,workers].every(Array.isArray)) return false;
    if (!Number.isFinite(foodStock) || foodStock < 0 || foodStock > LARDER_MAX * 2) return false;
    return dragons.every(d => d && typeof d.id === 'string' && typeof d.name === 'string' && Number.isFinite(d.hunger) && validFreedom(d.freedom)) &&
      wizards.every(w => w && typeof w.id === 'string' && typeof w.name === 'string') &&
      workers.every(w => w && typeof w.id === 'string' && typeof w.name === 'string');
  }

  const api = Object.freeze({
    LINEAGES,
    LARDER_MAX,
    DRAGON_COST,
    WIZARD_COST,
    hasStable,
    stableLocation,
    ensure,
    away, lifeDescription, wildPose, releaseDragon, decideFreely,
    isWizard,
    canFlyDragon,
    trainWizard,
    createNewWizard,
    summonDragon,
    assignWorker,
    replenishLarder,
    feedDragon,
    tick,
    blastFire,
    recordFlight,
    valid
  });

  root.EarthDragonStable = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
