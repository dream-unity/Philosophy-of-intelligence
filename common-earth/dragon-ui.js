/* Giant Wolf Cave UI dialog: manage the Majestic Wolf Pack, call new wolves,
   assign cave keepers to stock provisions, trigger Full Moon pack howls,
   and track the approaching Undead Plague Horde (Zombies). */
(function (root) {
  'use strict';

  function mount({ sim, street, enterStreet, notify, onUpdated }) {
    const doc = root.document;
    const dialog = doc.getElementById('dragon-stable-dialog');
    const body = doc.getElementById('dragon-stable-body');
    if (!dialog || !body || !root.EarthDragonStable) return null;

    const WC = root.EarthDragonStable;
    const make = (tag, text, cls) => {
      const e = doc.createElement(tag);
      if (text != null) e.textContent = text;
      if (cls) e.className = cls;
      return e;
    };
    const btn = (text, fn, cls = '') => {
      const b = make('button', text, cls);
      b.type = 'button';
      b.addEventListener('click', fn);
      return b;
    };

    let activeSiteId = '';
    let selectedLineage = WC.LINEAGES[0].id;

    function currentSite() {
      return root.EarthCommunityLife?.lookup?.(sim.state, activeSiteId) || sim.active();
    }

    async function runCmd(cmd, ...args) {
      const res = await sim.perform(cmd, ...args);
      if (res?.message) notify(res.message, !res.ok);
      onUpdated?.();
      render();
      return res;
    }

    function render() {
      const site = currentSite();
      if (!site) { dialog.close(); return; }
      const built = WC.hasStable(site);
      const ds = WC.ensure(site);
      const isNight = Boolean(root.EarthDayClock?.read?.(sim.state)?.night);

      body.replaceChildren();

      // Hero preview with moonlit Enchanted Forest, Giant Wolf Cave & Howling Majestic Wolf
      const hero = make('div', null, 'dragon-hero');
      const preview = doc.createElement('canvas');
      preview.width = 280;
      preview.height = 176;
      const ctx = preview.getContext('2d');
      if (ctx && root.EarthDragonArt) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, preview.height);
        skyGrad.addColorStop(0, '#091627');
        skyGrad.addColorStop(0.52, '#173042');
        skyGrad.addColorStop(0.76, '#1f4437');
        skyGrad.addColorStop(1, '#1a3529');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, preview.width, preview.height);

        // Radiant Full Moon in preview sky
        const mg = ctx.createRadialGradient(232, 34, 4, 232, 34, 42);
        mg.addColorStop(0, 'rgba(240,248,255,0.96)');
        mg.addColorStop(0.35, 'rgba(196,226,255,0.45)');
        mg.addColorStop(1, 'rgba(120,170,220,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(232, 34, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2f7ff';
        ctx.beginPath();
        ctx.arc(232, 34, 15, 0, Math.PI * 2);
        ctx.fill();

        const now = performance.now() / 1000;
        const drawCave = root.EarthDragonArt.drawWolfCave || root.EarthDragonArt.drawStable;
        const drawWolf = root.EarthDragonArt.drawMajesticWolf || root.EarthDragonArt.drawEnchantedDragon;
        drawCave(ctx, 148, 126, 33, true, now, Math.max(1, ds.dragons.length));
        const leadWolf = ds.dragons[0] || {
          coat: '#c6d1db', ruff: '#f2f6fb', under: '#8a98a6', eyes: '#8ff5ff', aura: '#d8eeff'
        };
        drawWolf(ctx, 64, 134, 24, 0, now, leadWolf, true, false, 0);
      }

      const intro = make('div');
      intro.append(
        make('small', built ? `Enchanted Forest Sanctuary · Pack Territory (${WC.MAX_OUTSIDE_METERS}m Border)` : 'Not Yet Carved'),
        make('h3', `${site.name} Giant Wolf Cave`),
        make('p', `Majestic Wolves shelter in this mossy woodland cave and roam the enchanted forest freely to hunt and tear down Zombies attacking ${site.name}. They patrol up to exactly ${WC.MAX_OUTSIDE_METERS} meters outside your community's territory — never further — and gather under every Full Moon to howl together in chorus.`)
      );
      hero.append(preview, intro);
      body.append(hero);

      // Live Undead Plague Horde (Zombie Outbreak) Status
      const zombieSummary = root.EarthGiantTrolls?.summary?.(sim.state, site.id);
      if (zombieSummary && zombieSummary.totalAlive > 0) {
        const siegeSec = make('section', null, 'dragon-card troll-card');
        const head = make('div', null, 'dragon-card-head');
        head.append(
          make('strong', `${zombieSummary.communityName} · Wave ${zombieSummary.wave}`),
          make('small', `${zombieSummary.localCount} stalking ${site.name} · ${zombieSummary.elsewhereCount} elsewhere · ${zombieSummary.totalSlain} eliminated`)
        );
        siegeSec.append(head);
        siegeSec.append(make('p', isNight
          ? 'Full Moon Night: the undead zombies howl without stopping and surge faster through the enchanted forest, trying to devour villagers, shelters, and roaming wolves alike!'
          : 'Waves of 10+ relentless zombies emerge from the dark woods hunting anything that moves — villagers, roaming wolves, and village shelters.'));
        const MAX_ROWS = 4;
        const shown = zombieSummary.local.slice(0, MAX_ROWS);
        for (const z of shown) {
          const row = make('div', null, 'troll-row');
          const distM = Math.round((root.EarthGiantTrolls?.distanceKm?.(z) ?? z.distanceKm ?? 0) * 1000);
          const phaseLabel = z.attackPhase === 'feed'
            ? `Devouring ${z.targetName || 'prey'}`
            : z.state === 'approaching'
              ? `Shambling in · ${distM}m out`
              : (z.targetName ? `Lunging at ${z.targetName}` : 'Hunting villagers');
          const howlNote = z.howling ? ' · HOWLING' : '';
          row.append(make('small', `${z.name} · ${z.title} · ${phaseLabel}${howlNote} — ${z.hp}/${z.maxHp} HP`));
          const bar = make('div', null, 'dragon-meter troll-meter');
          const fill = doc.createElement('i');
          fill.style.width = `${Math.max(4, Math.round((z.hp / Math.max(1, z.maxHp)) * 100))}%`;
          bar.append(fill);
          row.append(bar);
          siegeSec.append(row);
        }
        if (zombieSummary.local.length > MAX_ROWS) {
          const extra = zombieSummary.local.length - MAX_ROWS;
          siegeSec.append(make('small', `+ ${extra} more zombies shambling in Wave ${zombieSummary.wave} (${zombieSummary.local.length} active at ${site.name})`));
        }
        if (zombieSummary.elsewhere.length) {
          const otherTargets = [...new Set(zombieSummary.elsewhere.map(z => z.targetSiteName))].join(', ');
          siegeSec.append(make('small', `Also swarming neighbouring communities: ${otherTargets}`));
        }
        const siegeActions = make('div', null, 'dragon-actions');
        if (zombieSummary.local.length) {
          siegeActions.append(
            btn('Fight Back (Villager Defense)', () => runCmd('trollAction', { siteId: site.id, action: 'militiaStrike', trollId: zombieSummary.local[0].id })),
            btn('Pack Howl at the Moon', () => runCmd('dragonAction', { siteId: site.id, action: 'howl' }), 'primary-gold')
          );
        }
        siegeSec.append(siegeActions);
        body.append(siegeSec);
      }

      if (!built) {
        const card = make('section', null, 'dragon-card');
        card.append(
          make('strong', 'Carve the Giant Wolf Cave'),
          make('p', 'Carve a Giant Wolf Cave on woodland soil (8 funds · 5 materials) so Majestic Wolves can shelter here and defend your enchanted forest.'),
          make('div', null, 'dragon-actions')
        );
        card.lastChild.append(
          btn('Carve Giant Wolf Cave (8 funds · 5 materials)', () => runCmd('buildFreeBuilding', { siteId: site.id, kind: 'dragonStable' }), 'primary-gold')
        );
        body.append(card);
        return;
      }

      // Section 1: Majestic Wolf Pack
      const secWolves = make('section', null, 'dragon-grid');
      secWolves.append(make('h3', `Majestic Wolf Pack (${ds.dragons.length}) · Max ${WC.MAX_OUTSIDE_METERS}m Outside Territory`));

      if (!ds.dragons.length) {
        secWolves.append(make('p', 'Your Giant Wolf Cave is ready — call a Majestic Wolf below so the pack can patrol the enchanted forest and tear down approaching zombies!'));
      } else {
        const livePoses = WC.getAutonomousPoses?.(site) || [];
        for (const w of ds.dragons) {
          const card = make('article', null, 'dragon-card');
          const head = make('div', null, 'dragon-card-head');
          const pose = livePoses.find(p => p.wolf?.id === w.id || p.dragon?.id === w.id);
          const distOutsideM = pose ? Math.round(pose.outsideMeters || 0) : 0;
          const status = pose?.howling
            ? 'Howling at the Full Moon'
            : pose?.biting
              ? `Biting ${pose.targetName || 'Zombie'}!`
              : pose?.state === 'guard'
                ? `Holding ${WC.MAX_OUTSIDE_METERS}m Border`
                : pose?.defending
                  ? `Hunting ${pose.targetName || 'Zombie'}`
                  : 'Roaming Enchanted Forest';
          const hp = Math.round(w.hp ?? w.maxHp ?? 280);
          const maxHp = Math.round(w.maxHp ?? 280);
          head.append(
            make('strong', `${w.name} · ${w.lineageTitle}`),
            make('small', `${status} · Border: ${distOutsideM}m / ${WC.MAX_OUTSIDE_METERS}m · HP ${hp}/${maxHp} · Nourishment ${Math.round(w.hunger)}% · Zombies Slain ${w.autonomousKills || 0}`)
          );

          const hpMeter = make('div', null, 'dragon-meter wolf-hp-meter');
          const hpFill = doc.createElement('i');
          hpFill.style.width = `${Math.max(4, Math.round((hp / Math.max(1, maxHp)) * 100))}%`;
          hpMeter.append(hpFill);

          const hungerMeter = make('div', null, 'dragon-meter');
          const hungerFill = doc.createElement('i');
          hungerFill.style.width = `${Math.max(4, Math.round(w.hunger))}%`;
          hungerMeter.append(hungerFill);

          const actions = make('div', null, 'dragon-actions');
          actions.append(
            btn(`Feed & Heal ${w.name}`, () => runCmd('dragonAction', { siteId: site.id, action: 'feed', dragonId: w.id })),
            btn(`Howl with ${w.name}`, () => {
              root.EarthNightAudio?.triggerWolfHowl?.(1.0);
              runCmd('dragonAction', { siteId: site.id, action: 'howl', dragonId: w.id });
            }, 'primary-gold')
          );
          card.append(head, hpMeter, hungerMeter, actions);
          secWolves.append(card);
        }
      }

      // Call a new Majestic Wolf form
      const callBox = make('div', null, 'dragon-card');
      callBox.append(make('strong', `Call a New Majestic Wolf to the Cave (${WC.WOLF_COST.funds} funds · ${WC.WOLF_COST.food} food)`));
      const row = make('div', null, 'dragon-form-row');
      const lineageSel = doc.createElement('select');
      lineageSel.setAttribute('aria-label', 'Wolf bloodline');
      for (const l of WC.LINEAGES) {
        const opt = make('option', `${l.title} (Speed ×${l.speedBonus})`);
        opt.value = l.id;
        lineageSel.append(opt);
      }
      lineageSel.value = selectedLineage;
      lineageSel.addEventListener('change', () => { selectedLineage = lineageSel.value; });
      const nameInput = doc.createElement('input');
      nameInput.placeholder = 'Optional wolf name';
      nameInput.maxLength = 32;
      row.append(
        lineageSel,
        nameInput,
        btn('Call Majestic Wolf', () => runCmd('dragonAction', { siteId: site.id, action: 'summon', lineageId: lineageSel.value, name: nameInput.value }), 'primary-gold')
      );
      callBox.append(row);
      secWolves.append(callBox);
      body.append(secWolves);

      // Section 2: Cave Keepers & Provisions
      const secCare = make('section', null, 'dragon-grid');
      secCare.append(make('h3', 'Cave Provisions & Forest Keepers'));
      const careCard = make('div', null, 'dragon-card');
      careCard.append(
        make('strong', `Cave Provisions: ${ds.foodStock} / ${WC.LARDER_MAX} rations`),
        make('p', 'Well-fed wolves recover rapidly after fighting zombies. Assign villagers to tend the Giant Wolf Cave so they automatically stock provisions and care for the pack.')
      );
      const larderMeter = make('div', null, 'dragon-meter');
      const larderFill = doc.createElement('i');
      larderFill.style.width = `${Math.round((ds.foodStock / WC.LARDER_MAX) * 100)}%`;
      larderMeter.append(larderFill);
      careCard.append(larderMeter);

      const workersText = ds.workers.length
        ? 'Active cave keepers: ' + ds.workers.map(w => `${w.name} (${w.mealsReplenished || 0} stocked)`).join(', ')
        : 'No cave keepers assigned yet. Assign a villager below.';
      careCard.append(make('p', workersText));

      const workerRow = make('div', null, 'dragon-form-row');
      const peopleSel = doc.createElement('select');
      peopleSel.setAttribute('aria-label', 'Choose resident to tend the Giant Wolf Cave');
      const roster = root.EarthPersonas?.list?.(site) || site.residents || [];
      for (const p of roster) {
        const assigned = ds.workers.some(w => w.id === p.id);
        const opt = make('option', p.name + (assigned ? ' (Tending cave · Remove)' : ''));
        opt.value = p.id;
        peopleSel.append(opt);
      }
      workerRow.append(
        peopleSel,
        btn('Assign / Toggle Keeper', () => runCmd('dragonAction', { siteId: site.id, action: 'assignWorker', personId: peopleSel.value })),
        btn('Stock Provisions (+6)', () => runCmd('dragonAction', { siteId: site.id, action: 'replenishFood', amount: 6 }))
      );
      careCard.append(workerRow);
      secCare.append(careCard);
      body.append(secCare);

      // Recent Pack Chronicle
      if (ds.log.length) {
        const logBox = make('details');
        logBox.append(make('summary', `Giant Wolf Cave Chronicle (${ds.log.length})`));
        const ul = doc.createElement('ul');
        for (const entry of ds.log.slice(0, 8)) {
          ul.append(make('li', `Week ${entry.week} · ${entry.text}`));
        }
        logBox.append(ul);
        body.append(logBox);
      }
    }

    function open(siteId) {
      activeSiteId = siteId || sim.active()?.id || '';
      if (!currentSite()) return;
      render();
      if (!dialog.open) dialog.showModal();
    }

    // Legacy compatibility shim: clicking a wolf opens the Giant Wolf Cave panel
    function mountDragon(target) {
      open(target?.siteId || sim.active()?.id);
    }

    return { open, render, mountDragon };
  }

  root.EarthDragonUI = Object.freeze({ mount });
})(typeof window === 'undefined' ? globalThis : window);
