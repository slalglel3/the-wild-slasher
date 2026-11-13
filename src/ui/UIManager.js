// UI Manager: Landscape Mobile HUD & Modals
import { SaveSystem } from '../systems/SaveSystem.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.activeModal = null; // 'STATS', 'INVENTORY', 'REBIRTH', 'SLOTS', null
    this.selectedItemIndex = null;
    this.selectedBagIndex = null;
    this.pendingCreateSlotId = null;
    this.bindDOM();
  }

  bindDOM() {
    // Buttons on Top HUD
    const slotsBtn = document.getElementById('btn-slots');
    if (slotsBtn) slotsBtn.addEventListener('click', () => this.toggleModal('SLOTS'));
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

    // Revive action button
    const reviveBtn = document.getElementById('btn-do-revive');
    if (reviveBtn) {
      reviveBtn.addEventListener('click', () => {
        this.game.executeRevive();
        this.closeModal();
      });
    }

    // Salvage All button (Normal & Magic)
    const salvageAllBtn = document.getElementById('btn-salvage-all');
    if (salvageAllBtn) {
      salvageAllBtn.addEventListener('click', () => {
        const inv = this.game.player.inventory;
        const player = this.game.player;
        let totalGold = 0;
        let count = 0;

        for (let i = inv.items.length - 1; i >= 0; i--) {
          const item = inv.items[i];
          if (item && (item.rarity.id === 'NORMAL' || item.rarity.id === 'MAGIC')) {
            const res = inv.salvageItem(i, this.game.biomeManager.currentTierLevel);
            if (res) {
              totalGold += res.gold;
              count++;
            }
          }
        }

        if (count > 0) {
          player.gold += totalGold;
          this.game.floatingTexts.push({
            x: player.x,
            y: player.y - 40,
            text: `일괄 분해: +${totalGold}G 획득! (${count}개)`,
            color: '#ffd700',
            scale: 1.2,
            life: 1.5
          });
          this.updateInventoryModal();
        }
      });
    }

    // Item Detail Modal Action Buttons
    const detailClose = document.getElementById('item-detail-close');
    if (detailClose) {
      detailClose.addEventListener('click', () => {
        document.getElementById('modal-item-detail').style.display = 'none';
      });
    }

    const equipBtn = document.getElementById('btn-item-equip');
    if (equipBtn) {
      equipBtn.addEventListener('click', () => {
        if (this.selectedBagIndex !== null) {
          const res = this.game.player.inventory.equip(this.selectedBagIndex, this.game.player.level);
          if (!res.success) {
            this.game.floatingTexts.push({
              x: this.game.player.x,
              y: this.game.player.y - 35,
              text: res.reason,
              color: '#ff4444',
              scale: 1.1,
              life: 1.2
            });
          } else {
            this.game.player.recalcStats();
            document.getElementById('modal-item-detail').style.display = 'none';
            this.updateInventoryModal();
          }
        }
      });
    }

    const salvageBtn = document.getElementById('btn-item-salvage');
    if (salvageBtn) {
      salvageBtn.addEventListener('click', () => {
        if (this.selectedBagIndex !== null) {
          const res = this.game.player.inventory.salvageItem(this.selectedBagIndex, this.game.biomeManager.currentTierLevel);
          if (res) {
            this.game.player.gold += res.gold;
            this.game.floatingTexts.push({
              x: this.game.player.x,
              y: this.game.player.y - 40,
              text: `아이템 분해: +${res.gold}G 획득!`,
              color: '#ffd700',
              scale: 1.15,
              life: 1.2
            });
          }
          document.getElementById('modal-item-detail').style.display = 'none';
          this.updateInventoryModal();
        }
      });
    }

    const deleteBtn = document.getElementById('btn-item-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (this.selectedBagIndex !== null) {
          this.game.player.inventory.deleteItem(this.selectedBagIndex);
          document.getElementById('modal-item-detail').style.display = 'none';
          this.updateInventoryModal();
        }
      });
    }

    // Create Character Modal Actions
    const createSlotClose = document.getElementById('btn-create-slot-close');
    if (createSlotClose) {
      createSlotClose.addEventListener('click', () => {
        document.getElementById('modal-create-slot').style.display = 'none';
      });
    }

    const confirmCreateBtn = document.getElementById('btn-confirm-create-char');
    if (confirmCreateBtn) {
      confirmCreateBtn.addEventListener('click', () => {
        const input = document.getElementById('input-char-name');
        const name = (input.value || '').trim() || '야생용사';
        if (this.pendingCreateSlotId !== null) {
          SaveSystem.createCharacter(this.pendingCreateSlotId, name, 'WARRIOR');
          SaveSystem.loadCharacter(this.pendingCreateSlotId, this.game);
          document.getElementById('modal-create-slot').style.display = 'none';
          this.closeModal();
          this.game.loadBiomeWorld();
        }
      });
    }

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
      if (modalName === 'SLOTS') this.updateSlotsModal();
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
      const iconSrc = `./assets/items/item_${slot.toLowerCase()}.png`;

      if (item) {
        div.style.borderColor = item.color;
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px;">
            <img src="${iconSrc}" style="width:28px; height:28px; border-radius:4px; background:#111;">
            <div>
              <div class="slot-name">${slot}</div>
              <div style="color:${item.color}; font-size:11px; font-weight:bold;">${item.name}</div>
            </div>
          </div>
        `;
        div.onclick = () => {
          inv.unequip(slot);
          this.game.player.recalcStats();
          this.updateInventoryModal();
        };
      } else {
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px;">
            <img src="${iconSrc}" style="width:28px; height:28px; border-radius:4px; opacity:0.35; filter:grayscale(1);">
            <div>
              <div class="slot-name">${slot}</div>
              <div class="slot-empty">(비어있음)</div>
            </div>
          </div>
        `;
      }
      equipContainer.appendChild(div);
    });

    // Display Gold
    const goldDisplay = document.getElementById('inv-gold-display');
    if (goldDisplay) goldDisplay.innerText = `${this.game.player.gold}`;

    // Render Bag Grid
    const bagGrid = document.getElementById('inventory-bag-grid');
    bagGrid.innerHTML = '';
    for (let i = 0; i < inv.capacity; i++) {
      const item = inv.items[i];
      const slot = document.createElement('div');
      slot.className = 'bag-slot';
      if (item) {
        const iconSrc = `./assets/items/item_${item.slot.toLowerCase()}.png`;
        slot.style.borderColor = item.color;
        slot.innerHTML = `
          <img src="${iconSrc}" style="width:24px; height:24px; pointer-events:none;">
          <span style="color:${item.color}; font-size:8px; line-height:1; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:38px;">${item.name}</span>
        `;
        slot.title = `${item.name} (클릭 시 옵션)`;
        slot.onclick = () => {
          this.openItemDetailModal(i, item);
        };
      } else {
        slot.innerHTML = '';
      }
      bagGrid.appendChild(slot);
    }
  }

  openItemDetailModal(index, item) {
    this.selectedBagIndex = index;
    const modal = document.getElementById('modal-item-detail');
    if (!modal || !item) return;

    document.getElementById('item-detail-name').innerText = item.name;
    document.getElementById('item-detail-name').style.color = item.color;
    document.getElementById('item-detail-slot').innerText = `[${item.rarity.name}] ${item.slot} (아이템 Lv.${item.itemLevel || item.tier || 1})`;

    // Format stats summary
    const statsLines = [];
    const pLevel = this.game.player.level;
    const reqLvl = item.reqLevel || 1;
    const canEquip = pLevel >= reqLvl;
    statsLines.push(`<span style="color:${canEquip ? '#48bb78' : '#f56565'}; font-weight:bold;">• 착용 요구 레벨: Lv.${reqLvl} (내 레벨: Lv.${pLevel})</span>`);

    if (item.stats.attack) statsLines.push(`• 공격력: +${item.stats.attack}`);
    if (item.stats.defense) statsLines.push(`• 방어력: +${item.stats.defense}`);
    if (item.stats.hp) statsLines.push(`• 최대 생명력: +${item.stats.hp}`);
    if (item.stats.speed) statsLines.push(`• 이동속도: +${item.stats.speed}`);
    if (item.stats.critChance) statsLines.push(`• 치명타율: +${item.stats.critChance.toFixed(1)}%`);
    if (item.stats.STR) statsLines.push(`• 힘: +${item.stats.STR}`);
    if (item.stats.DEX) statsLines.push(`• 민첩: +${item.stats.DEX}`);
    if (item.stats.INT) statsLines.push(`• 지능: +${item.stats.INT}`);
    if (item.stats.VIT) statsLines.push(`• 체력: +${item.stats.VIT}`);
    if (item.stats.LUK) statsLines.push(`• 행운: +${item.stats.LUK}`);

    const baseGold = item.rarity.id === 'LEGENDARY' ? 1200 :
                     item.rarity.id === 'RARE' ? 450 :
                     item.rarity.id === 'MAGIC' ? 150 : 50;
    const salvageGold = baseGold + this.game.biomeManager.currentTierLevel * 8;
    statsLines.push(`<span style="color:#ffd700; margin-top:4px; display:inline-block;">• 분해 시 환급 골드: 🪙 ${salvageGold} G</span>`);

    document.getElementById('item-detail-stats').innerHTML = statsLines.join('<br>') || '추가 능력치 없음';
    modal.style.display = 'flex';
  }

  updateSlotsModal() {
    const container = document.getElementById('slots-grid-container');
    if (!container) return;
    container.innerHTML = '';

    const slots = SaveSystem.getSlots();
    const currentSlotId = SaveSystem.getCurrentSlotId();

    slots.forEach(s => {
      const card = document.createElement('div');
      card.style.background = s.slotId === currentSlotId ? 'rgba(49, 130, 206, 0.25)' : 'rgba(26, 32, 44, 0.85)';
      card.style.border = s.slotId === currentSlotId ? '2px solid #3182ce' : '1px solid #4a5568';
      card.style.borderRadius = '8px';
      card.style.padding = '12px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';
      card.style.gap = '8px';

      if (s.exists) {
        card.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:bold; color:#00ffcc; font-size:13px;">[슬롯 ${s.slotId + 1}] ${s.slotId === currentSlotId ? '★ 현재 플레이 중' : ''}</span>
              <span style="font-size:10px; color:#a0aec0;">${s.updatedAt}</span>
            </div>
            <div style="font-size:15px; font-weight:bold; color:#fff; margin-top:4px;">⚔️ ${s.name}</div>
            <div style="font-size:12px; color:#ffd700; margin-top:2px;">Lv.${s.level} ${s.className || '전사'} (환생 ${s.rebirthCount}회)</div>
            <div style="font-size:11px; color:#e2e8f0; margin-top:2px;">지역: ${s.biomeName} (Tier ${s.tierLevel}) | 🪙 ${s.gold} G</div>
          </div>
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button class="btn-do-rebirth btn-select-slot" style="flex:1; padding:6px; font-size:12px; background:linear-gradient(90deg, #2b6cb0, #3182ce);">
              ${s.slotId === currentSlotId ? '이어서 모험' : '선택 플레이'}
            </button>
            <button class="btn-do-rebirth btn-delete-slot" style="padding:6px 10px; font-size:12px; background:#e53e3e;">
              삭제
            </button>
          </div>
        `;

        card.querySelector('.btn-select-slot').onclick = () => {
          if (s.slotId !== currentSlotId) {
            // Save current before switching
            SaveSystem.saveCharacter(currentSlotId, this.game);
            SaveSystem.loadCharacter(s.slotId, this.game);
            this.game.loadBiomeWorld();
          }
          this.closeModal();
        };

        card.querySelector('.btn-delete-slot').onclick = () => {
          if (confirm(`정말로 슬롯 ${s.slotId + 1} (${s.name}) 캐릭터를 삭제하시겠습니까?`)) {
            SaveSystem.deleteCharacter(s.slotId);
            this.updateSlotsModal();
          }
        };
      } else {
        card.innerHTML = `
          <div style="text-align:center; padding:18px 0;">
            <div style="font-weight:bold; color:#718096; font-size:13px;">[슬롯 ${s.slotId + 1}] 빈 슬롯</div>
            <div style="font-size:11px; color:#4a5568; margin-top:4px;">캐릭터가 없습니다</div>
          </div>
          <button class="btn-do-rebirth btn-create-slot" style="width:100%; padding:6px; font-size:12px; background:linear-gradient(90deg, #38a169, #48bb78);">
            ➕ 새 캐릭터 생성
          </button>
        `;

        card.querySelector('.btn-create-slot').onclick = () => {
          this.pendingCreateSlotId = s.slotId;
          document.getElementById('input-char-name').value = `용사 ${s.slotId + 1}`;
          document.getElementById('modal-create-slot').style.display = 'flex';
        };
      }

      container.appendChild(card);
    });
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
