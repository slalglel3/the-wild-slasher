// Diablo-style Inventory & Equipment System

import { CONFIG } from '../config.js';

const AFFIX_NAMES = [
  { name: '용사의', stat: 'STR', min: 2, max: 8 },
  { name: '바람의', stat: 'DEX', min: 2, max: 8 },
  { name: '지혜의', stat: 'INT', min: 2, max: 8 },
  { name: '불굴의', stat: 'VIT', min: 3, max: 10 },
  { name: '행운의', stat: 'LUK', min: 2, max: 8 },
  { name: '학살자의', stat: 'attack', min: 5, max: 18 },
  { name: '철벽의', stat: 'defense', min: 4, max: 15 },
  { name: '생명의', stat: 'hp', min: 30, max: 120 },
  { name: '광폭의', stat: 'critChance', min: 2, max: 6 },
  { name: '신속의', stat: 'speed', min: 10, max: 30 }
];

const ITEM_BASE_NAMES = {
  WEAPON: ['녹슨 검', '양손 대검', '전쟁 망치', '화염 칼날', '학살의 도끼'],
  ARMOR: ['가죽 흉갑', '강철 판금갑옷', '고대 미스릴 갑옷', '용린 갑옷'],
  HELMET: ['가죽 투구', '기사의 투구', '야수의 두개골', '불사조 관'],
  BOOTS: ['가죽 장화', '철제 군화', '바람의 샌들', '용암 활보 장화'],
  AMULET: ['청동 부적', '루비 목걸이', '빛의 펜던트', '어둠의 심장'],
  RING: ['철 반지', '은반지', '에메랄드 반지', '영겁의 고리']
};

export class InventorySystem {
  constructor() {
    this.capacity = 24;
    this.items = []; // Array of items
    this.equipment = {
      WEAPON: null,
      ARMOR: null,
      HELMET: null,
      BOOTS: null,
      AMULET: null,
      RING: null
    };
  }

  rollItem(tierLevel = 1, magicFind = 1.0) {
    return InventorySystem.generateItem(tierLevel, magicFind);
  }

  // Salvage item: remove from bag and return gold reward based on rarity
  salvageItem(index, tierLevel = 1) {
    if (index < 0 || index >= this.items.length) return null;
    const item = this.items.splice(index, 1)[0];
    const baseGold = item.rarity.id === 'LEGENDARY' ? 1200 :
                     item.rarity.id === 'RARE' ? 450 :
                     item.rarity.id === 'MAGIC' ? 150 : 50;
    const goldReward = baseGold + tierLevel * 8;
    return { item, gold: goldReward };
  }

  // Delete item: remove from bag without reward
  deleteItem(index) {
    if (index < 0 || index >= this.items.length) return null;
    return this.items.splice(index, 1)[0];
  }

  // Generate random item drop based on monster tier/level and player magic find
  static generateItem(tierOrLevel = 1, magicFind = 1.0, guaranteedRarity = null) {
    const slots = CONFIG.ITEM_SLOTS;
    const slot = slots[Math.floor(Math.random() * slots.length)];
    
    // Balanced Rarity Roll: Normal 76%, Magic 19%, Rare 4.4%, Legendary 0.6%
    const roll = Math.random() * 100 / magicFind;
    let rarityKey = 'NORMAL';
    if (guaranteedRarity) {
      rarityKey = guaranteedRarity;
    } else if (roll < 0.6) {
      rarityKey = 'LEGENDARY';
    } else if (roll < 5.0) {
      rarityKey = 'RARE';
    } else if (roll < 24.0) {
      rarityKey = 'MAGIC';
    }

    const rarity = CONFIG.ITEM_RARITY[rarityKey];
    const baseNames = ITEM_BASE_NAMES[slot];
    const baseName = baseNames[Math.min(baseNames.length - 1, Math.floor(Math.random() * baseNames.length))];

    // Calculate Item Level (1 ~ 100)
    const itemLevel = Math.max(1, Math.min(100, Math.floor(tierOrLevel)));
    const reqLevel = Math.max(1, itemLevel - 1);

    // Roll affixes & Stats based on Item Level
    // Design rule: A Lv.30 Normal item MUST be stronger than a Lv.10 Legendary item!
    const affixes = [];
    const stats = { STR: 0, DEX: 0, INT: 0, VIT: 0, LUK: 0, attack: 0, defense: 0, hp: 0, critChance: 0, speed: 0 };
    
    // Base stats scaled by itemLevel^1.3
    const levelPower = Math.pow(itemLevel, 1.3);
    if (slot === 'WEAPON') {
      stats.attack = Math.floor((6 + levelPower * 2.0) * rarity.mult);
    }
    if (slot === 'ARMOR' || slot === 'HELMET') {
      stats.defense = Math.floor((4 + levelPower * 1.3) * rarity.mult);
    }
    if (slot === 'BOOTS') {
      stats.speed = Math.floor((12 + itemLevel * 0.7) * Math.min(1.4, rarity.mult));
      stats.defense = Math.floor((2 + levelPower * 0.6) * rarity.mult);
    }
    if (slot === 'AMULET' || slot === 'RING') {
      stats.hp = Math.floor((20 + levelPower * 3.5) * rarity.mult);
      if (itemLevel >= 20) stats.critChance = Math.min(25, Number((1.5 + (itemLevel * 0.12) * rarity.mult).toFixed(1)));
    }

    // Pick unique affixes with level scaling
    const shuffledAffixes = [...AFFIX_NAMES].sort(() => 0.5 - Math.random());
    const pickedAffixes = shuffledAffixes.slice(0, rarity.affixCount);

    let prefix = '';
    pickedAffixes.forEach((aff, idx) => {
      const val = Math.floor((aff.min + Math.random() * (aff.max - aff.min)) * (1 + itemLevel * 0.08) * (rarity.mult * 0.8));
      stats[aff.stat] = (stats[aff.stat] || 0) + val;
      affixes.push({ name: aff.name, stat: aff.stat, value: val });
      if (idx === 0) prefix = aff.name + ' ';
    });

    return {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: `[Lv.${itemLevel}] ${prefix}${baseName}`,
      baseName,
      slot,
      rarity: rarityKey,
      color: rarity.color,
      itemLevel,
      reqLevel,
      stats,
      affixes,
      tier: itemLevel
    };
  }

  addItem(item) {
    if (this.items.length < this.capacity) {
      this.items.push(item);
      return true;
    }
    return false;
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      return this.items.splice(index, 1)[0];
    }
    return null;
  }

  equip(index, playerLevel = 100) {
    const item = this.items[index];
    if (!item) return { success: false, reason: '아이템이 존재하지 않습니다.' };

    if (item.reqLevel && playerLevel < item.reqLevel) {
      return { success: false, reason: `착용 불가: 요구 레벨 Lv.${item.reqLevel} (현재 Lv.${playerLevel})` };
    }

    const currentEquip = this.equipment[item.slot];
    this.equipment[item.slot] = item;
    this.items.splice(index, 1);

    if (currentEquip) {
      this.items.push(currentEquip);
    }
    return { success: true };
  }

  unequip(slot) {
    const item = this.equipment[slot];
    if (item && this.items.length < this.capacity) {
      this.equipment[slot] = null;
      this.items.push(item);
      return true;
    }
    return false;
  }

  getEquipStats() {
    const total = { STR: 0, DEX: 0, INT: 0, VIT: 0, LUK: 0, attack: 0, defense: 0, hp: 0, mp: 0, critChance: 0, critDamage: 0, speed: 0, cdr: 0, magicFind: 0 };
    for (const slot of Object.keys(this.equipment)) {
      const item = this.equipment[slot];
      if (item && item.stats) {
        for (const [st, val] of Object.entries(item.stats)) {
          total[st] = (total[st] || 0) + val;
        }
      }
    }
    return total;
  }
}
