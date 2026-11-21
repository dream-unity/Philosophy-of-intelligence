/* Shadowfell Darklands — Enemy Giant Troll Community.
   Colossal building-sized trolls rising from the darkness of the lands from the
   start of every game, continually attacking both the player's community and
   neighbouring human communities to rid the lands of all human Sims.
   Difficult to kill with ordinary weapons; especially vulnerable to Enchanted
   Dragons and originating-community Wizards' Staff Thunder. */
(function (root) {
  'use strict';

  const COMMUNITY = Object.freeze({
    id: 'troll-darklands',
    name: 'Shadowfell Darklands',
    title: 'Enemy Giant Troll Community',
    region: 'The Darkness of the Lands',
    lore: 'Towering building-sized trolls risen from the dark reaches of the lands, relentlessly hunting every human community to erase all human Sims.'
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

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

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

  function makeTroll(horde, targetSite, slotIndex, week, wave) {
    horde.serial = (horde.serial || 0) + 1;
    const arch = ARCHETYPES[(horde.serial - 1) % ARCHETYPES.length];
    const waveScale = 1 + Math.min(0.45, Math.max(0, wave - 1) * 0.08);
    const maxHp = Math.round(arch.maxHp * waveScale);
    // Spawn right in immediate Street View sightlines marching toward human streets
    const entrySpots = [
      { x: 10.6, y: 11.4, wx: -44, wz: -38 },
      { x: 16.4, y: 12.2, wx: 46, wz: -34 },
      { x: 12.4, y: 9.2, wx: 2, wz: -56 },
      { x: 8.6, y: 14.8, wx: -48, wz: 20 }
    ];
    const spot = entrySpots[slotIndex % entrySpots.length];
    const jitter = ((horde.serial * 37) % 10) * 0.25 - 1.1;
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
      state: 'marching', // 'marching' | 'besieging' | 'slain'
      targetSiteId: targetSite.id,
      targetSiteName: targetSite.name || 'Human Settlement',
      isPlayerTarget: Boolean(targetSite._isPlayer),
      x: Number((spot.x + jitter).toFixed(2)),
      y: Number((spot.y + jitter * 0.5).toFixed(2)),
      worldX: Math.round(spot.wx + jitter * 5),
      worldZ: Math.round(spot.wz + jitter * 4),
      swingPhase: (horde.serial * 1.1) % (Math.PI * 2),
      attackCooldown: 1.5,
      burnedWeek: -10,
      humansKilled: 0,
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
          attacksLaunched: 0,
          spawnedWeek: world.week || 1
        },
        serial: 0,
        trolls: [],
        log: []
      };
    }
    const horde = world.trollHorde;
    horde.community ||= { ...COMMUNITY, wave: 1, totalSlain: 0, humansLost: 0, attacksLaunched: 0, spawnedWeek: world.week || 1 };
    horde.trolls ||= [];
    horde.log ||= [];

    // Immediately launch attacks from the start of every game once a community exists!
    if (communities.length > 0 && horde.trolls.length === 0) {
      const active = communities.find(s => s.id === world.activeId) || communities[0];
      const others = communities.filter(s => s.id !== active.id);
      // 2 colossal building-sized Giant Trolls immediately march on the player's community
      horde.trolls.push(makeTroll(horde, { ...active, _isPlayer: true }, 0, world.week || 1, 1));
      horde.trolls.push(makeTroll(horde, { ...active, _isPlayer: true }, 1, world.week || 1, 1));
      // Simultaneously attack neighbouring / other human communities across the lands!
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
        'From the darkness of the lands, the ' + COMMUNITY.name + ' Giant Trolls emerged! Building-sized titans are attacking ' +
        active.name + ' and neighbouring human communities!'
      );
    }
    return horde;
  }

  function record(horde, week, text) {
    if (!horde) return;
    horde.log.unshift({ week: week || 1, text });
    if (horde.log.length > 30) horde.log.length = 30;
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
    return {
      communityName: COMMUNITY.name,
      wave: horde?.community?.wave || 1,
      totalSlain: horde?.community?.totalSlain || 0,
      humansLost: horde?.community?.humansLost || 0,
      localCount: local.length,
      elsewhereCount: elsewhere.length,
      totalAlive: allAlive.length,
      local,
      elsewhere,
      recentLog: horde?.log?.[0]?.text || ''
    };
  }

  function stepLive(world, site, dt) {
    if (!world || !site) return [];
    ensure(world);
    const local = trollsForSite(world, site.id);
    const events = [];
    const step = clamp(dt || 0.016, 0.001, 0.25);

    for (let i = 0; i < local.length; i++) {
      const t = local[i];
      const goalX = 11.2 + (i % 2 === 0 ? -3.4 : 3.6);
      const goalY = 10.6 + (i % 3) * 1.6;
      const dx = goalX - t.x;
      const dy = goalY - t.y;
      const dist = Math.hypot(dx, dy);
      t.swingPhase = ((t.swingPhase || 0) + step * (dist > 3.2 ? 2.4 : 3.2)) % (Math.PI * 2);

      if (dist > 2.6) {
        t.state = 'marching';
        const speed = 0.62;
        t.x = Number((t.x + (dx / dist) * speed * step).toFixed(3));
        t.y = Number((t.y + (dy / dist) * speed * step).toFixed(3));
      } else {
        t.state = 'besieging';
        t.attackCooldown = (t.attackCooldown || 3.5) - step;
        if (t.attackCooldown <= 0) {
          t.attackCooldown = 4.5;
          events.push({ type: 'slam', troll: t });
        }
      }
      t.worldX = Math.round((t.x - 12) * 5.6);
      t.worldZ = Math.round((t.y - 12) * 5.6);
    }
    return events;
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
        : opts.attackerName || (site.name + ' defenders');
      const msg = 'Colossal Victory! ' + slayer + ' slew ' + troll.name + ' the Giant Troll (' + troll.heightMeters + 'm) defending ' + site.name + '! (+3 funds, +4 trust)';
      record(horde, world.week || 1, msg);
      return { ok: true, troll, dealt, killed: true, hp: 0, maxHp: troll.maxHp, message: msg };
    }

    const pct = Math.ceil((troll.hp / troll.maxHp) * 100);
    let msg;
    if (source === 'wizardThunder') {
      msg = (opts.wizardName || 'Wizard') + '\'s Protective Staff Thunder shattered ' + troll.name + '\'s dark hide for ' + dealt + ' damage! (' + troll.hp + '/' + troll.maxHp + ' HP · ' + pct + '%)';
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

      const dragons = target.dragonStable?.dragons?.length || 0;
      const wizards = target.dragonStable?.wizards?.length || 0;
      const soldiers = target.militaryBase?.units?.filter(u => u.type === 'soldier')?.length || 0;
      const fort = target.communityLife?.border?.defence?.stage || 0;

      if (dragons > 0 && wizards > 0) {
        const autoDmg = Math.min(85, 38 + dragons * 18 + wizards * 12);
        troll.hp = Math.max(0, troll.hp - autoDmg);
        troll.burnedWeek = week;
        if (troll.hp <= 0) {
          troll.state = 'slain';
          horde.community.totalSlain = (horde.community.totalSlain || 0) + 1;
          const slayNote = target.name + '\'s guardian dragons and wizards slew ' + troll.name + ' the Giant Troll during the weekly siege!';
          record(horde, week, slayNote);
          reports.push({ site: target, text: slayNote });
          continue;
        }
      }

      const mitigation = Math.min(0.65, dragons * 0.22 + soldiers * 0.06 + fort * 0.12);
      const pop = target.population || 0;
      let killedHumans = 0;
      if (pop > 2) {
        const rawCasualties = mitigation >= 0.45 ? 1 : (troll.heightMeters >= 22 ? 2 : 1);
        const floor = target.id === world.activeId ? 2 : 0;
        killedHumans = Math.max(0, Math.min(rawCasualties, pop - floor));
      } else if (pop > 0 && target.id !== world.activeId) {
        killedHumans = 1;
      }

      if (killedHumans > 0) {
        target.population = Math.max(0, pop - killedHumans);
        troll.humansKilled = (troll.humansKilled || 0) + killedHumans;
        horde.community.humansLost = (horde.community.humansLost || 0) + killedHumans;
      }
      if ((target.materials || 0) > 1) target.materials = Math.max(1, target.materials - 1);
      target.wellbeing = clamp((target.wellbeing || 50) - (mitigation >= 0.4 ? 1 : 3), 0, 100);
      troll.state = 'besieging';

      const note = killedHumans > 0
        ? troll.name + ' (' + troll.heightMeters + 'm Giant Troll of ' + COMMUNITY.name + ') smashed through ' + target.name + ', killing ' + killedHumans + ' human Sim' + (killedHumans > 1 ? 's' : '') + '! (' + troll.hp + '/' + troll.maxHp + ' HP)'
        : troll.name + ' (' + troll.heightMeters + 'm Giant Troll) battered the perimeter of ' + target.name + ', held back from human Sims by local defenses! (' + troll.hp + '/' + troll.maxHp + ' HP)';
      record(horde, week, note);
      reports.push({ site: target, text: note });
    }

    const alive = activeTrolls(world);
    const activeSite = byId.get(world.activeId) || communities[0];
    const otherSites = communities.filter(s => s.id !== activeSite?.id && (s.population || 0) > 0);
    const localAlive = alive.filter(t => t.targetSiteId === activeSite?.id);

    if (activeSite && localAlive.length < 2 && (localAlive.length === 0 || week % 2 === 0)) {
      horde.community.wave = (horde.community.wave || 1) + (localAlive.length === 0 ? 1 : 0);
      const fresh = makeTroll(horde, { ...activeSite, _isPlayer: true }, localAlive.length, week, horde.community.wave);
      horde.trolls.push(fresh);
      horde.community.attacksLaunched = (horde.community.attacksLaunched || 0) + 1;
      const arriveNote = 'Darkness stirs! A massive ' + fresh.heightMeters + 'm Giant Troll — ' + fresh.name + ' — marched out of ' + COMMUNITY.name + ' to attack ' + activeSite.name + '!';
      record(horde, week, arriveNote);
      reports.push({ site: activeSite, text: arriveNote });
    }

    const otherAlive = alive.filter(t => t.targetSiteId !== activeSite?.id);
    if (otherSites.length > 0 && otherAlive.length < Math.min(2, otherSites.length)) {
      const victim = otherSites[(week + horde.serial) % otherSites.length];
      const freshOther = makeTroll(horde, { ...victim, _isPlayer: false }, 2, week, horde.community.wave || 1);
      horde.trolls.push(freshOther);
      horde.community.attacksLaunched = (horde.community.attacksLaunched || 0) + 1;
      const otherNote = COMMUNITY.name + ' dispatched ' + freshOther.name + ' (' + freshOther.heightMeters + 'm Giant Troll) to hunt human Sims in ' + victim.name + '!';
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
