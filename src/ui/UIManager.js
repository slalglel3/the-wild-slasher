// UI Manager: Landscape Mobile HUD & Modals

export class UIManager {
  constructor(game) {
    this.game = game;
    this.activeModal = null; // 'STATS', 'INVENTORY', 'REBIRTH', null
    this.selectedItemIndex = null;
    this.bindDOM();
  }

  bindDOM() {
    // Buttons on Top HUD
    document.getElementById('btn-stats').addEventListener('click', () => this.toggleModal('STATS'));
    document.getElementById('btn-inventory').addEventListener('click', () => this.toggleModal('INVENTORY'));
    document.getElementById('btn-rebirth').addEventListener('click', () => this.toggleModal('REBIRTH'));
    document.getElementById('btn-bot').addEventListener('click', () => this.game.toggleBot());

    // Modal Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });

    // Rebirth action button
    document.getElementById('btn-do-rebirth').addEventListener('click', () => {
      this.game.executeRebirth();
      this.closeModal();
    });

    // Stat allocation buttons
    ['STR', 'DEX', 'INT', 'VIT', 'LUK'].forEach(st => {
      const btn = document.getElementById(`btn-add-${st.toLowerCase()}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.game.player.statSystem.allocate(st, 1);
          this.game.player.recalcStats();
          this.updateStatsModal();
        });
      }
    });
  }

  toggleModal(modalName) {
    if (this.activeModal === modalName) {
      this.closeModal();
    } else {
      this.openModal(modalName);
    }
  }

  openModal(modalName) {
    this.activeModal = modalName;
    document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
    const target = document.getElementById(`modal-${modalName.toLowerCase()}`);
    if (target) {
      target.style.display = 'flex';
      if (modalName === 'STATS') this.updateStatsModal();
      if (modalName === 'INVENTORY') this.updateInventoryModal();
      if (modalName === 'REBIRTH') this.updateRebirthModal();
    }
  }

  closeModal() {
    this.activeModal = null;
    document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
  }

  updateHUD() {
    const player = this.game.player;
    const biome = this.game.biomeManager.currentBiome;
    const tier = this.game.biomeManager.currentTierLevel;
    const rebirth = this.game.rebirthSystem;

    // HP / MP / EXP bars
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.derived.maxHp) * 100));
    const mpPct = Math.max(0, Math.min(100, (player.mp / player.derived.maxMp) * 100));
    const expPct = Math.max(0, Math.min(100, (player.exp / player.expToNext) * 100));

    document.getElementById('hud-hp-bar').style.width = `${hpPct}%`;
    document.getElementById('hud-hp-text').innerText = `${Math.floor(player.hp)} / ${player.derived.maxHp}`;

    document.getElementById('hud-mp-bar').style.width = `${mpPct}%`;
    document.getElementById('hud-mp-text').innerText = `${Math.floor(player.mp)} / ${player.derived.maxMp}`;

    document.getElementById('hud-exp-bar').style.width = `${expPct}%`;
    document.getElementById('hud-exp-text').innerText = `Lv.${player.level} (${expPct.toFixed(1)}%)`;

    // Biome & World Tier Badge
    document.getElementById('hud-biome-name').innerText = `${biome.name}`;
    document.getElementById('hud-tier-badge').innerText = `난이도 Tier ${tier}`;

    // Rebirth stats indicator
    document.getElementById('hud-rebirth-info').innerText = `환생 ${rebirth.rebirthCount}회 (보너스 +${rebirth.accumulatedBonusStats}pt)`;

    // Unallocated stats alert on button
    const unalloc = player.statSystem.unallocatedPoints;
    const statBtn = document.getElementById('btn-stats');
    if (unalloc > 0) {
      statBtn.innerText = `스탯 (+${unalloc})`;
      statBtn.classList.add('pulse-glow');
    } else {
      statBtn.innerText = '스탯 (C)';
      statBtn.classList.remove('pulse-glow');
    }

    // Bot status indicator
    const botBtn = document.getElementById('btn-bot');
    if (this.game.botActive) {
      botBtn.innerText = '🤖 QA봇: ON';
      botBtn.classList.add('bot-active');
    } else {
      botBtn.innerText = '🤖 QA봇: OFF';
      botBtn.classList.remove('bot-active');
    }
  }

  updateStatsModal() {
    const player = this.game.player;
    const stats = player.derived.stats;
    const der = player.derived;
    const unalloc = player.statSystem.unallocatedPoints;

    document.getElementById('stat-unallocated').innerText = `${unalloc}`;
    document.getElementById('val-str').innerText = `${stats.STR} (${player.statSystem.base.STR}+${player.statSystem.allocated.STR})`;
    document.getElementById('val-dex').innerText = `${stats.DEX} (${player.statSystem.base.DEX}+${player.statSystem.allocated.DEX})`;
    document.getElementById('val-int').innerText = `${stats.INT} (${player.statSystem.base.INT}+${player.statSystem.allocated.INT})`;
    document.getElementById('val-vit').innerText = `${stats.VIT} (${player.statSystem.base.VIT}+${player.statSystem.allocated.VIT})`;
    document.getElementById('val-luk').innerText = `${stats.LUK} (${player.statSystem.base.LUK}+${player.statSystem.allocated.LUK})`;

    document.getElementById('derived-attack').innerText = `${der.minDmg} ~ ${der.maxDmg}`;
    document.getElementById('derived-defense').innerText = `${der.defense}`;
    document.getElementById('derived-crit').innerText = `${der.critChance.toFixed(1)}% (피해 ${der.critDamage.toFixed(0)}%)`;
    document.getElementById('derived-speed').innerText = `${der.moveSpeed.toFixed(0)}`;
    document.getElementById('derived-cdr').innerText = `${der.cdr.toFixed(1)}%`;
    document.getElementById('derived-mf').innerText = `+${((der.magicFind - 1) * 100).toFixed(0)}%`;

    // Disable add buttons if no points
    ['str', 'dex', 'int', 'vit', 'luk'].forEach(st => {
      document.getElementById(`btn-add-${st}`).disabled = unalloc <= 0;
    });
  }

  updateInventoryModal() {
    const inv = this.game.player.inventory;
    
    // Render Equip Slots
    const equipContainer = document.getElementById('inventory-equip-slots');
    equipContainer.innerHTML = '';
    ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'AMULET', 'RING'].forEach(slot => {
      const item = inv.equipment[slot];
      const div = document.createElement('div');
      div.className = 'equip-slot';
      if (item) {
        div.style.borderColor = item.color;
        div.innerHTML = `<span class="slot-name">${slot}</span><span style="color:${item.color}">${item.name}</span>`;
        div.onclick = () => {
          inv.unequip(slot);
          this.game.player.recalcStats();
          this.updateInventoryModal();
        };
      } else {
        div.innerHTML = `<span class="slot-name">${slot}</span><span class="slot-empty">(비어있음)</span>`;
      }
      equipContainer.appendChild(div);
    });

    // Render Bag Grid
    const bagGrid = document.getElementById('inventory-bag-grid');
    bagGrid.innerHTML = '';
    for (let i = 0; i < inv.capacity; i++) {
      const item = inv.items[i];
      const slot = document.createElement('div');
      slot.className = 'bag-slot';
      if (item) {
        slot.style.borderColor = item.color;
        slot.innerHTML = `<span style="color:${item.color}; font-size:11px;">${item.name}</span>`;
        slot.title = `클릭하여 장착: ${item.name}`;
        slot.onclick = () => {
          inv.equip(i);
          this.game.player.recalcStats();
          this.updateInventoryModal();
        };
      } else {
        slot.innerHTML = '';
      }
      bagGrid.appendChild(slot);
    }
  }

  updateRebirthModal() {
    const player = this.game.player;
    const rebirth = this.game.rebirthSystem;
    const canRebirth = rebirth.canRebirth(player.level);

    document.getElementById('rebirth-current-count').innerText = `${rebirth.rebirthCount}회`;
    document.getElementById('rebirth-next-bonus').innerText = `+${25}pt (누적 +${rebirth.accumulatedBonusStats + 25}pt)`;
    
    const btn = document.getElementById('btn-do-rebirth');
    btn.disabled = !canRebirth;
    if (!canRebirth) {
      document.getElementById('rebirth-req-msg').innerText = `* 환생 조건: 30레벨 이상 필요 (현재 Lv.${player.level})`;
      document.getElementById('rebirth-req-msg').style.color = '#ff4444';
    } else {
      document.getElementById('rebirth-req-msg').innerText = `* 환생 가능! 환생 시 1레벨로 리셋되지만 바이옴 난이도가 셔플되고 영구 스탯이 추가됩니다.`;
      document.getElementById('rebirth-req-msg').style.color = '#44ff44';
    }
  }
}
