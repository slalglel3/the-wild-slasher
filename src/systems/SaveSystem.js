// Persistent Multi-Character Slot & Save System

export class SaveSystem {
  static TOTAL_SLOTS = 4;
  static CURRENT_SLOT_KEY = 'ws_current_slot_id';

  static getSlots() {
    const slots = [];
    for (let i = 0; i < this.TOTAL_SLOTS; i++) {
      const raw = localStorage.getItem(`ws_char_slot_${i}`);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          slots.push({ slotId: i, exists: true, ...data.meta });
        } catch (e) {
          slots.push({ slotId: i, exists: false });
        }
      } else {
        slots.push({ slotId: i, exists: false });
      }
    }
    return slots;
  }

  static getCurrentSlotId() {
    const saved = localStorage.getItem(this.CURRENT_SLOT_KEY);
    return saved !== null ? parseInt(saved, 10) : 0;
  }

  static setCurrentSlotId(slotId) {
    localStorage.setItem(this.CURRENT_SLOT_KEY, `${slotId}`);
  }

  static saveCharacter(slotId, game) {
    if (!game || !game.player) return false;
    const p = game.player;

    const data = {
      meta: {
        name: p.name || '야생의 전사',
        classKey: p.classKey || 'WARRIOR',
        className: p.classData ? p.classData.name : '전사',
        level: p.level,
        rebirthCount: game.rebirthSystem ? game.rebirthSystem.rebirthCount : 0,
        tierLevel: game.biomeManager ? game.biomeManager.currentTierLevel : 20,
        biomeName: game.biomeManager ? game.biomeManager.currentBiome.name : '초원',
        gold: p.gold || 0,
        updatedAt: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      },
      player: {
        name: p.name || '야생의 전사',
        classKey: p.classKey || 'WARRIOR',
        level: p.level,
        exp: p.exp,
        expToNext: p.expToNext,
        hp: p.hp,
        mp: p.mp,
        gold: p.gold || 0,
        allocatedStats: p.statSystem.allocated,
        unallocatedPoints: p.statSystem.unallocatedPoints
      },
      inventory: {
        equipment: p.inventory.equipment,
        items: p.inventory.items
      },
      rebirth: {
        rebirthCount: game.rebirthSystem.rebirthCount,
        accumulatedBonusStats: game.rebirthSystem.accumulatedBonusStats
      },
      world: {
        tierLevel: game.biomeManager.currentTierLevel,
        currentBiomeId: game.biomeManager.currentBiome.id
      }
    };

    localStorage.setItem(`ws_char_slot_${slotId}`, JSON.stringify(data));
    this.setCurrentSlotId(slotId);
    return true;
  }

  static loadCharacter(slotId, game) {
    const raw = localStorage.getItem(`ws_char_slot_${slotId}`);
    if (!raw || !game) return false;

    try {
      const data = JSON.parse(raw);
      const p = game.player;

      // 1. Restore Player Vitals & Stats
      p.name = data.player.name || '야생의 전사';
      p.classKey = data.player.classKey || 'WARRIOR';
      p.level = data.player.level;
      p.exp = data.player.exp;
      p.expToNext = data.player.expToNext;
      p.gold = data.player.gold || 0;

      p.statSystem.allocated = { ...data.player.allocatedStats };
      p.statSystem.unallocatedPoints = data.player.unallocatedPoints;

      // 2. Restore Inventory & Equipment
      p.inventory.equipment = { ...data.inventory.equipment };
      p.inventory.items = [...data.inventory.items];

      // 3. Restore Rebirth System
      if (data.rebirth) {
        game.rebirthSystem.rebirthCount = data.rebirth.rebirthCount || 0;
        game.rebirthSystem.accumulatedBonusStats = data.rebirth.accumulatedBonusStats || 0;
      }

      // 4. Restore World Progress
      if (data.world && data.world.currentBiomeId) {
        game.biomeManager.currentTierLevel = data.world.tierLevel || 20;
      }

      // Recalculate stats & vitals
      p.recalcStats();
      p.hp = p.derived.maxHp;
      p.mp = p.derived.maxMp;

      this.setCurrentSlotId(slotId);
      return true;
    } catch (e) {
      console.error('Failed to load character slot:', e);
      return false;
    }
  }

  static createCharacter(slotId, name, classKey = 'WARRIOR') {
    const data = {
      meta: {
        name: name || `용사 ${slotId + 1}`,
        classKey,
        className: '전사 (Warrior)',
        level: 1,
        rebirthCount: 0,
        tierLevel: 20,
        biomeName: '초원',
        gold: 100,
        updatedAt: '방금 생성됨'
      },
      player: {
        name: name || `용사 ${slotId + 1}`,
        classKey,
        level: 1,
        exp: 0,
        expToNext: 250,
        hp: 100,
        mp: 100,
        gold: 100,
        allocatedStats: { STR: 0, DEX: 0, INT: 0, VIT: 0, LUK: 0 },
        unallocatedPoints: 0
      },
      inventory: {
        equipment: { WEAPON: null, ARMOR: null, HELMET: null, BOOTS: null, AMULET: null, RING: null },
        items: []
      },
      rebirth: {
        rebirthCount: 0,
        accumulatedBonusStats: 0
      },
      world: {
        tierLevel: 20,
        currentBiomeId: 'GRASSLAND'
      }
    };

    localStorage.setItem(`ws_char_slot_${slotId}`, JSON.stringify(data));
    this.setCurrentSlotId(slotId);
    return true;
  }

  static deleteCharacter(slotId) {
    localStorage.removeItem(`ws_char_slot_${slotId}`);
  }
}
