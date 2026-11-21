/* Dragon Stable UI dialog: manage enchanted dragons, train/switch Wizards,
   assign feeding workers, replenish food larder, fire attacks & 3D flight launch. */
(function (root) {
  'use strict';

  function mount({ sim, street, enterStreet, notify, onUpdated }) {
    const doc = root.document;
    const dialog = doc.getElementById('dragon-stable-dialog');
    const body = doc.getElementById('dragon-stable-body');
    const picker = doc.getElementById('dragon-rider-dialog');
    let mounting = false;
    if (!dialog || !body || !root.EarthDragonStable) return null;

    const DS = root.EarthDragonStable;
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
    let selectedLineage = DS.LINEAGES[0].id;
    let selectedTargetKind = 'fun';

    function currentSite() {
      return root.EarthCommunityLife?.lookup?.(sim.state, activeSiteId) || sim.active();
    }

    function activeActorId(site) {
      return root.EarthAgency?.actorId?.(site) || 'steward';
    }

    async function runCmd(cmd, ...args) {
      const res = await sim.perform(cmd, ...args);
      if (res?.message) notify(res.message, !res.ok);
      onUpdated?.();
      render();
      return res;
    }

    function flightMessage(message, error = false) {
      const sheet = picker.open ? picker : dialog.open ? dialog : null;
      if (!sheet) { notify(message, error); return; }
      let status = sheet.querySelector('[data-mount-status]');
      if (!status) {
        status = make('p');
        status.dataset.mountStatus = '';
        status.setAttribute('role', 'status');
        sheet.querySelector('header').after(status);
      }
      status.textContent = message;
      status.scrollIntoView({block:'nearest'});
    }

    async function mountDragon(target, riderId, launchExtras = {}) {
      if (mounting || root.EarthFlight3D?.isOpen()) return;
      const site = root.EarthCommunityLife.lookup(sim.state, target.siteId);
      if (!site) { flightMessage('This town is no longer available.', true); return; }
      const ds = DS.ensure(site);
      const dragon = ds.dragons.find(d => d.id === target.dragonId);
      if (!dragon) { flightMessage('This dragon is no longer in the stable.', true); return; }
      const actor = activeActorId(site);
      if (!riderId && DS.isWizard(site, actor)) riderId = actor;
      if (!riderId && ds.wizards.length === 1) riderId = ds.wizards[0].id;
      if (!riderId && ds.wizards.length > 1) {
        doc.getElementById('dragon-rider-title').textContent = 'Who will ride ' + dragon.name + '?';
        const choices = doc.getElementById('dragon-rider-options');
        choices.replaceChildren(...ds.wizards.map(w => btn(w.name + ' · ' + w.title, () => mountDragon(target, w.id, launchExtras))));
        picker.querySelector('[data-mount-status]')?.remove();
        if (!picker.open) picker.showModal();
        return;
      }
      const check = DS.canFlyDragon(site, riderId, dragon.id);
      if (!check.ok) { flightMessage(check.reason, true); return; }
      const wizard = check.wizard;
      mounting = true;
      try {
        if (!root.EarthFlight3D) {
          const sheet = picker.open ? picker : dialog.open ? dialog : null;
          flightMessage('Preparing dragon flight…');
          const engineEl = doc.getElementById('flight-engine');
          const engineSrc = engineEl?.src || new URL('flight-3d.js', root.location?.href || 'http://localhost/common-earth/').href;
          try {
            await import(engineSrc);
          } catch (firstErr) {
            console.warn('Initial flight module load failed, retrying fresh:', firstErr);
          }
          if (!root.EarthFlight3D) {
            const sep = engineSrc.includes('?') ? '&' : '?';
            await import(engineSrc + sep + 'retry=' + Date.now());
          }
          if (!root.EarthFlight3D) {
            flightMessage('Dragon flight engine could not load. Please refresh and try again.', true);
            return;
          }
          if (doc.hidden || (sheet && !sheet.open) || root.EarthFlight3D.isOpen()) return;
        }
        const launched = root.EarthFlight3D.launch({
          mode: 'dragon', site, world: sim.state, dragon, wizard, origin: target,
          evening: Boolean(root.EarthDayClock?.read?.(sim.state)?.night),
          teleportBaseId: launchExtras.teleportBaseId || null,
          autoTeleportEnemy: Boolean(launchExtras.autoTeleportEnemy),
          onFireHit: hit => sim.perform('dragonAction', { siteId: site.id, action: 'blastFire', riderId: wizard.id, dragonId: dragon.id, target: hit }).then(() => onUpdated?.()),
          onThunderStrike: hit => sim.perform('dragonAction', { siteId: site.id, action: 'strikeThunder', riderId: wizard.id, dragonId: dragon.id, target: hit }).then(() => onUpdated?.()),
          onTeleportBase: base => sim.perform('dragonAction', { siteId: site.id, action: 'teleportEnemyBase', riderId: wizard.id, dragonId: dragon.id, base }).then(() => onUpdated?.()),
          onExit: stats => {
            sim.perform('dragonAction', { siteId: site.id, action: 'recordFlight', riderId: wizard.id, dragonId: dragon.id, stats }).then(() => onUpdated?.());
            const killNote = stats.kills ? ` · ${stats.kills} enemies defeated` : '';
            notify(wizard.name + ' and ' + dragon.name + ' returned from flight (' + Math.round(stats.distanceFlown) + ' m flown' + killNote + ').');
            doc.getElementById('street-canvas')?.focus({preventScroll:true});
          }
        });
        if (!launched) { flightMessage('Dragon flight could not start on this device.', true); return; }
        if (picker.open) picker.close();
        if (dialog.open) dialog.close();
        enterStreet?.();
        doc.getElementById('flight-3d-canvas')?.focus({preventScroll:true});
      } catch (error) {
        console.error('Dragon flight could not start', error);
        flightMessage('Dragon flight could not start. Try mounting again.', true);
      } finally {
        mounting = false;
      }
    }

    function render() {
      const site = currentSite();
      if (!site) { dialog.close(); return; }
      const built = DS.hasStable(site);
      const ds = DS.ensure(site);
      const actorId = activeActorId(site);
      const actorName = root.EarthAgency?.identity?.(site, actorId)?.name || actorId;
      const actorIsWizard = DS.isWizard(site, actorId);

      body.replaceChildren();
      dialog.querySelector('[data-mount-status]')?.remove();

      // Hero preview with painterly Dragon Sanctuary Citadel & Enchanted Dragon illustration
      const hero = make('div', null, 'dragon-hero');
      const preview = doc.createElement('canvas');
      preview.width = 280; preview.height = 176;
      const ctx = preview.getContext('2d');
      if (ctx && root.EarthDragonArt) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, preview.height);
        skyGrad.addColorStop(0, '#1c445c');
        skyGrad.addColorStop(0.55, '#4b808e');
        skyGrad.addColorStop(0.78, '#c9b48c');
        skyGrad.addColorStop(1, '#587852');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, preview.width, preview.height);
        root.EarthDragonArt.drawStable(ctx, 140, 114, 34, false, performance.now() / 1000, Math.max(1, ds.dragons.length));
        const leadDragon = ds.dragons[0] || { scale: '#e2a83c', accent: '#fff0b8', wing: '#a84e24', aura: '#ffcf66', fire: '#ff8a24' };
        root.EarthDragonArt.drawEnchantedDragon(ctx, 64, 46, 17, -0.22, performance.now() / 1000, leadDragon, true, false);
      }
      const intro = make('div');
      intro.append(
        make('small', built ? 'Sanctuary Active · Unrestricted 3D Sky Exploration' : 'Not Yet Built'),
        make('h3', site.name + ' Dragon Stable'),
        make('p', 'Raise magical enchanted dragons, train Wizards to fly them anywhere across the 3D world — over town, open ocean, mountain peaks, volcano calderas, floating sky-islands, and neighbouring settlements — and command volumetric dragonfire.')
      );
      hero.append(preview, intro);
      body.append(hero);

      if (!built) {
        const card = make('section', null, 'dragon-card');
        card.append(
          make('strong', 'Build the Dragon Stable'),
          make('p', 'Commission a Dragon Stable on open land (8 funds · 5 materials) so you can summon enchanted dragons and train Wizards.'),
          make('div', null, 'dragon-actions')
        );
        card.lastChild.append(
          btn('Build Dragon Stable Now (8 funds · 5 materials)', () => runCmd('buildFreeBuilding', { siteId: site.id, kind: 'dragonStable' }), 'primary-gold')
        );
        body.append(card);
        return;
      }

      // Section 1: Enchanted Dragons & 3D Aerodynamic Flight
      const secDragons = make('section', null, 'dragon-grid');
      secDragons.append(make('h3', `Enchanted Dragons (${ds.dragons.length})`));

      if (!ds.dragons.length) {
        secDragons.append(make('p', 'No dragons are stabled yet. Summon your first enchanted dragon below!'));
      } else {
        let riderSelect;
        if (ds.wizards.length > 1) {
          const label = make('label', 'Wizard rider ');
          riderSelect = make('select');
          for (const w of ds.wizards) {
            const option = make('option', w.name + ' · ' + w.title);
            option.value = w.id;
            option.selected = w.id === actorId || w.residentId === actorId;
            riderSelect.append(option);
          }
          label.append(riderSelect);
          secDragons.append(label);
        }
        const enemyBases = DS.enemyBasesAtWar?.(sim.state, site) || [];
        const primaryEnemy = enemyBases[0] || null;
        for (const d of ds.dragons) {
          const card = make('article', null, 'dragon-card');
          const head = make('div', null, 'dragon-card-head');
          const killsText = d.kills ? ` · Enemies Defeated ${d.kills}` : '';
          head.append(
            make('strong', `${d.name} · ${d.lineageTitle}`),
            make('small', `Nourishment ${Math.round(d.hunger)}% · Flights ${d.flights || 0} · Fire Blasts ${d.blasts || 0}${killsText}`)
          );
          const meter = make('div', null, 'dragon-meter');
          const fill = doc.createElement('i');
          fill.style.width = `${Math.max(4, Math.round(d.hunger))}%`;
          meter.append(fill);

          const actions = make('div', null, 'dragon-actions');
          const flyBtn = btn('Mount & Fly ' + d.name, () => mountDragon(
            { siteId: site.id, dragonId: d.id }, riderSelect?.value
          ), 'primary-gold');

          const raidLabel = primaryEnemy
            ? (primaryEnemy.atWar ? `Teleport & Raid ${primaryEnemy.townName} [WAR]` : `Teleport & Raid ${primaryEnemy.name}`)
            : 'Teleport & Raid Enemy Base';
          const raidBtn = btn(raidLabel, () => mountDragon(
            { siteId: site.id, dragonId: d.id },
            riderSelect?.value,
            { autoTeleportEnemy: true, teleportBaseId: primaryEnemy?.id || null }
          ), 'fire-action');

          const feedBtn = btn(`Feed ${d.name}`, () => runCmd('dragonAction', { siteId: site.id, action: 'feed', dragonId: d.id }));
          const funFireBtn = btn('Blast Fire (Mid-Flight Fun)', () => {
            const riderId = actorIsWizard ? actorId : ds.wizards[0]?.id;
            runCmd('dragonAction', { siteId: site.id, action: 'blastFire', riderId: riderId || actorId, dragonId: d.id, target: { kind: 'fun' } });
          }, 'fire-action');

          const strikeBtn = btn('Fire Attack Target', () => {
            const riderId = actorIsWizard ? actorId : ds.wizards[0]?.id;
            const target = selectedTargetKind === 'building'
              ? { kind: 'building', name: site.buildings?.[0]?.name || 'Rival Structure', id: site.buildings?.[0]?.id }
              : { kind: 'enemy', name: 'Rival Outpost Watch' };
            runCmd('dragonAction', { siteId: site.id, action: 'blastFire', riderId: riderId || actorId, dragonId: d.id, target });
          }, 'fire-action');

          actions.append(flyBtn, raidBtn, feedBtn, funFireBtn, strikeBtn);
          card.append(head, meter, actions);
          secDragons.append(card);
        }
      }

      // Summon new Enchanted Dragon form
      const summonBox = make('div', null, 'dragon-card');
      summonBox.append(make('strong', `Raise a New Enchanted Dragon (${DS.DRAGON_COST.funds} funds · ${DS.DRAGON_COST.food} food)`));
      const row = make('div', null, 'dragon-form-row');
      const lineageSel = doc.createElement('select');
      lineageSel.setAttribute('aria-label', 'Dragon lineage');
      for (const l of DS.LINEAGES) {
        const opt = make('option', `${l.title} (Speed ×${l.speedBonus})`);
        opt.value = l.id;
        lineageSel.append(opt);
      }
      lineageSel.value = selectedLineage;
      lineageSel.addEventListener('change', () => { selectedLineage = lineageSel.value; });
      const nameInput = doc.createElement('input');
      nameInput.placeholder = 'Optional dragon name';
      nameInput.maxLength = 32;
      const targetSel = doc.createElement('select');
      targetSel.setAttribute('aria-label', 'Fire attack target');
      for (const [val, label] of [['enemy', 'Target: Enemy Watch'], ['building', 'Target: Building']]) {
        const o = make('option', label); o.value = val; targetSel.append(o);
      }
      targetSel.value = selectedTargetKind === 'building' ? 'building' : 'enemy';
      targetSel.addEventListener('change', () => { selectedTargetKind = targetSel.value; });
      row.append(lineageSel, nameInput, btn('Summon Enchanted Dragon', () => runCmd('dragonAction', { siteId: site.id, action: 'summon', lineageId: lineageSel.value, name: nameInput.value }), 'primary-gold'));
      summonBox.append(row);
      const targetRow = make('div', null, 'dragon-form-row');
      targetRow.append(make('small', 'Default fire-attack target:'), targetSel);
      summonBox.append(targetRow);
      secDragons.append(summonBox);
      body.append(secDragons);

      // Section 2: Wizards (Created & Trained from the Dragon Stable — Only Wizards can fly Dragons!)
      const secWiz = make('section', null, 'dragon-grid');
      secWiz.append(make('h3', `Wizards (${ds.wizards.length}) · Required to Fly Dragons`));
      const wizCard = make('div', null, 'dragon-card');
      wizCard.append(make('p', actorIsWizard
        ? `You are currently playing as ${actorName}, a trained Wizard cleared to fly any dragon.`
        : `Active character (${actorName}) is not a Wizard yet. Only Wizards trained at the Dragon Stable can fly dragons.`));
      if (ds.wizards.length) {
        const ul = doc.createElement('ul');
        for (const w of ds.wizards) {
          ul.append(make('li', `${w.name} — ${w.title} (${w.flights || 0} flights)`));
        }
        wizCard.append(ul);
      }
      const wizActions = make('div', null, 'dragon-actions');
      if (!actorIsWizard) {
        wizActions.append(btn(`Train ${actorName} as Wizard (${DS.WIZARD_COST.funds} funds)`, () => runCmd('dragonAction', { siteId: site.id, action: 'trainWizard', personId: actorId }), 'primary-gold'));
      }
      wizActions.append(btn(`Create New Wizard at Stable (${DS.WIZARD_COST.funds} funds)`, () => runCmd('dragonAction', { siteId: site.id, action: 'createWizard', name: '' })));
      wizCard.append(wizActions);
      secWiz.append(wizCard);
      body.append(secWiz);

      // Section 3: Larder & Stable Workers (Regularly Replenish Dragon Food)
      const secCare = make('section', null, 'dragon-grid');
      secCare.append(make('h3', 'Dragon Food Larder & Stable Workers'));
      const careCard = make('div', null, 'dragon-card');
      careCard.append(
        make('strong', `Stable Food Stock: ${ds.foodStock} / ${DS.LARDER_MAX} rations`),
        make('p', 'Dragons must be fed regularly. Assign residents to work at the Dragon Stable so they automatically replenish the larder and feed hungry dragons.')
      );
      const larderMeter = make('div', null, 'dragon-meter');
      const larderFill = doc.createElement('i');
      larderFill.style.width = `${Math.round((ds.foodStock / DS.LARDER_MAX) * 100)}%`;
      larderMeter.append(larderFill);
      careCard.append(larderMeter);

      const workersText = ds.workers.length
        ? 'Active stable workers: ' + ds.workers.map(w => `${w.name} (${w.mealsReplenished || 0} stocked)`).join(', ')
        : 'No workers assigned yet. Assign a resident below!';
      careCard.append(make('p', workersText));

      const workerRow = make('div', null, 'dragon-form-row');
      const peopleSel = doc.createElement('select');
      peopleSel.setAttribute('aria-label', 'Choose resident to assign to Dragon Stable');
      const roster = root.EarthPersonas?.list?.(site) || site.residents || [];
      for (const p of roster) {
        const assigned = ds.workers.some(w => w.id === p.id);
        const opt = make('option', p.name + (assigned ? ' (Working here · Remove)' : ''));
        opt.value = p.id;
        peopleSel.append(opt);
      }
      workerRow.append(
        peopleSel,
        btn('Assign / Toggle Worker', () => runCmd('dragonAction', { siteId: site.id, action: 'assignWorker', personId: peopleSel.value })),
        btn('Replenish Food (+6)', () => runCmd('dragonAction', { siteId: site.id, action: 'replenishFood', amount: 6 }))
      );
      careCard.append(workerRow);
      secCare.append(careCard);
      body.append(secCare);

      // Recent Dragon Stable Log
      if (ds.log.length) {
        const logBox = make('details');
        logBox.append(make('summary', `Dragon Stable Chronicle (${ds.log.length})`));
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

    return { open, render, mountDragon };
  }

  root.EarthDragonUI = Object.freeze({ mount });
})(typeof window === 'undefined' ? globalThis : window);
