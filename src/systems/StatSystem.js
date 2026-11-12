// Stat & Character Attributes System

export class StatSystem {
  constructor(baseStats = { STR: 15, DEX: 10, INT: 8, VIT: 14, LUK: 8 }) {
    this.base = { ...baseStats };
    this.allocated = { STR: 0, DEX: 0, INT: 0, VIT: 0, LUK: 0 };
    this.bonusRebirth = { STR: 0, DEX: 0, INT: 0, VIT: 0, LUK: 0 }; // Rebirth permanent points
    this.unallocatedPoints = 0;
  }

  get totalStats() {
    return {
      STR: this.base.STR + this.allocated.STR + this.bonusRebirth.STR,
      DEX: this.base.DEX + this.allocated.DEX + this.bonusRebirth.DEX,
      INT: this.base.INT + this.allocated.INT + this.bonusRebirth.INT,
      VIT: this.base.VIT + this.allocated.VIT + this.bonusRebirth.VIT,
      LUK: this.base.LUK + this.allocated.LUK + this.bonusRebirth.LUK,
    };
  }

  // Calculate derived stats including equipment bonuses
  computeDerived(level, equipStats = {}) {
    const raw = this.totalStats;
    const stats = {
      STR: raw.STR + (equipStats.STR || 0),
      DEX: raw.DEX + (equipStats.DEX || 0),
      INT: raw.INT + (equipStats.INT || 0),
      VIT: raw.VIT + (equipStats.VIT || 0),
      LUK: raw.LUK + (equipStats.LUK || 0),
    };

    const maxHp = Math.floor(stats.VIT * 25 + stats.STR * 6 + level * 25 + (equipStats.hp || 0));
    const maxMp = Math.floor(stats.INT * 18 + level * 10 + (equipStats.mp || 0));
    const minDmg = Math.floor(stats.STR * 2.2 + stats.DEX * 0.8 + (equipStats.attack || 0));
    const maxDmg = Math.floor(stats.STR * 2.8 + stats.DEX * 1.4 + (equipStats.attack || 0) * 1.2 + 5);
    const defense = Math.floor(stats.VIT * 1.8 + stats.STR * 0.6 + (equipStats.defense || 0));
    
    // Critical Chance in %
    const critChance = Math.min(75, 5 + (stats.DEX * 0.25 + stats.LUK * 0.45) + (equipStats.critChance || 0));
    // Critical Damage in %
    const critDamage = 150 + stats.LUK * 1.2 + (equipStats.critDamage || 0);
    // Movement speed in px/s
    const moveSpeed = 160 + Math.min(120, stats.DEX * 1.1) + (equipStats.speed || 0);
    // Magic/Skill Cooldown reduction % (Max 40%)
    const cdr = Math.min(40, stats.INT * 0.35 + (equipStats.cdr || 0));
    // Magic find multiplier for item drops
    const magicFind = 1.0 + (stats.LUK * 0.025) + (equipStats.magicFind || 0);

    return {
      stats,
      maxHp,
      maxMp,
      minDmg,
      maxDmg,
      defense,
      critChance,
      critDamage,
      moveSpeed,
      cdr,
      magicFind
    };
  }

  addUnallocatedPoints(amount) {
    this.unallocatedPoints += amount;
  }

  allocate(statName, points = 1) {
    if (this.unallocatedPoints >= points && this.allocated[statName] !== undefined) {
      this.allocated[statName] += points;
      this.unallocatedPoints -= points;
      return true;
    }
    return false;
  }

  resetAllocated() {
    let total = 0;
    for (const key of Object.keys(this.allocated)) {
      total += this.allocated[key];
      this.allocated[key] = 0;
    }
    this.unallocatedPoints += total;
  }
}
