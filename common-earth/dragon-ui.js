/* Dragon Stable UI dialog: manage enchanted dragons, train/switch Wizards,
   assign feeding workers, replenish food larder, fire attacks & 3D flight launch. */
(function (root) {
  'use strict';

  function mount({ sim, street, enterStreet, notify, onUpdated }) {
    const doc = root.document;
    const dialog = doc.getElementById('dragon-stable-dialog');
    const body = doc.getElementById('dragon-stable-body');
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

    function launch3DFlight(site, dragon, wizard) {
      if (!root.EarthFlight3D) {
        notify('3D Flight Engine is still loading. Try again in a moment.', true);
        return;
      }
      dialog.close();
      enterStreet?.();
      const clock = root.EarthDayClock?.read?.(sim.state);
      root.EarthFlight3D.launch({
        mode: 'dragon',
        site,
        world: sim.state,
        dragon,
        wizard,
        evening: Boolean(clock?.night),
        onFireHit: hit => {
          sim.perform('dragonAction', { siteId: site.id, action: 'blastFire', riderId: wizard.id, dragonId: dragon.id, target: hit }).then(() => onUpdated?.());
        },
        onExit: stats => {
          sim.perform('dragonAction', { siteId: site.id, action: 'recordFlight', riderId: wizard.id, dragonId: dragon.id, stats }).then(() => onUpdated?.());
          notify(`${wizard.name} and ${dragon.name} returned from flight (${Math.round(stats.distanceFlown)}m flown, ${stats.fireBlasts} fire blasts).`);
        }
      });
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

      // Hero preview with live 2D Dragon Stable & Enchanted Dragon illustration
      const hero = make('div', null, 'dragon-hero');
      const preview = doc.createElement('canvas');
      preview.width = 240; preview.height = 156;
      const ctx = preview.getContext('2d');
      if (ctx && root.EarthDragonArt) {
        root.EarthDragonArt.drawStable(ctx, 120, 96, 30, false, performance.now() / 1000, Math.max(1, ds.dragons.length));
      }
      const intro = make('div');
      intro.append(
        make('small', built ? 'Sanctuary Active · Unrestricted Sky Access' : 'Not Yet Built'),
        make('h3', site.name + ' Dragon Stable'),
        make('p', 'Raise magical enchanted dragons, train Wizards to fly them anywhere across the 3D sky, assign keepers to replenish dragon food, and command dragonfire against enemies, buildings, or mid-flight for fun.')
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
        for (const d of ds.dragons) {
          const card = make('article', null, 'dragon-card');
          const head = make('div', null, 'dragon-card-head');
          head.append(
            make('strong', `${d.name} · ${d.lineageTitle}`),
            make('small', `Nourishment ${Math.round(d.hunger)}% · Flights ${d.flights || 0} · Fire Blasts ${d.blasts || 0}`)
          );
          const meter = make('div', null, 'dragon-meter');
          const fill = doc.createElement('i');
          fill.style.width = `${Math.max(4, Math.round(d.hunger))}%`;
          meter.append(fill);

          const actions = make('div', null, 'dragon-actions');
          const canFly = DS.canFlyDragon(site, actorId, d.id);
          const flyLabel = actorIsWizard
            ? `Mount & Fly ${d.name} (3D Sky)`
            : ds.wizards.length
              ? `Fly as ${ds.wizards[0].name} (Wizard)`
              : 'Train a Wizard to Fly';
          const flyBtn = btn(flyLabel, () => {
            if (actorIsWizard) {
              const check = DS.canFlyDragon(site, actorId, d.id);
              if (!check.ok) { notify(check.reason, true); return; }
              launch3DFlight(site, check.dragon, check.wizard);
            } else if (ds.wizards.length) {
              const wiz = ds.wizards[0];
              const check = DS.canFlyDragon(site, wiz.id, d.id);
              if (!check.ok) { notify(check.reason, true); return; }
              launch3DFlight(site, check.dragon, check.wizard);
            } else {
              notify(canFly.reason, true);
            }
          }, 'primary-gold');

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

          actions.append(flyBtn, feedBtn, funFireBtn, strikeBtn);
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

    return { open, render };
  }

  root.EarthDragonUI = Object.freeze({ mount });
})(typeof window === 'undefined' ? globalThis : window);
