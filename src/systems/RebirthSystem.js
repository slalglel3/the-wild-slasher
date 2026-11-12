// Rebirth (Prestige) & World Tier Scaling System

import { CONFIG } from '../config.js';

export class RebirthSystem {
  constructor() {
    this.rebirthCount = 0;
    this.accumulatedBonusStats = 0; // Permanent stat points gained from rebirths
    this.clearedTiers = 0;
  }

  // Check if player is eligible to rebirth
  canRebirth(playerLevel) {
    // Can rebirth from level 30+, recommended at 100 when facing difficulty wall
    return playerLevel >= 30;
  }

  // Perform rebirth
  performRebirth(player, biomeManager, newClassKey = 'WARRIOR') {
    this.rebirthCount += 1;
    const bonusPoints = CONFIG.REBIRTH_STAT_BONUS; // 25 points = 5 levels
    this.accumulatedBonusStats += bonusPoints;

    // Reset player progression
    player.level = 1;
    player.exp = 0;
    player.expToNext = 100;
    
    // Reset stats & give permanent bonus
    player.statSystem.allocated = { STR: 0, DEX: 0, INT: 0, VIT: 0, LUK: 0 };
    player.statSystem.unallocatedPoints = this.accumulatedBonusStats;
    
    // Job/Class re-selection
    if (CONFIG.CLASSES[newClassKey]) {
      player.classKey = newClassKey;
      player.classData = CONFIG.CLASSES[newClassKey];
      player.statSystem.base = { ...player.classData.baseStats };
    }

    // Advance advancement level tracking
    player.advancementTier = 0;

    // Shuffle Biomes & Reassign World Tiers!
    biomeManager.shuffleWorld(this.rebirthCount);

    return {
      rebirthCount: this.rebirthCount,
      bonusStatsGiven: bonusPoints,
      totalBonusStats: this.accumulatedBonusStats,
      startingBiome: biomeManager.currentBiome
    };
  }

  // Calculate effective world tier difficulty factor
  // Tier 20 is the soft wall for Run 0 (Rebirth 0)
  getDifficultyFactor(tierNumber) {
    // Tier ranges from 20 to 100
    // Beyond tier 20, difficulty escalates sharply unless player has rebirth stat bonuses
    const baseScale = tierNumber / 20;
    if (this.rebirthCount === 0 && tierNumber > 20) {
      // Wall penalty for first run trying to push past tier 20
      return Math.pow(baseScale, 2.5);
    }
    const rebirthReduction = Math.max(0.4, 1.0 - (this.rebirthCount * 0.12));
    return Math.pow(baseScale, 1.6) * rebirthReduction;
  }
}
