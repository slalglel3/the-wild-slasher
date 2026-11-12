// Biome Manager & World Difficulty Shuffler

import { CONFIG } from '../config.js';

export class BiomeManager {
  constructor() {
    this.biomeKeys = Object.keys(CONFIG.BIOMES);
    this.difficultyTiers = [20, 40, 60, 80, 100];
    this.worldTiers = []; // Array of { biomeKey, tierLevel, biomeData }
    this.currentTierIndex = 0; // Current active index (0 is starting tier 20)

    // Initial shuffle for Run 0 (Defaults to Grassland at 20 for gentle intro, or random)
    this.initDefaultWorld();
  }

  initDefaultWorld() {
    // 1st run: Grassland (20) -> Desert (40) -> Tropical (60) -> Tundra (80) -> Volcanic (100)
    const preset = ['GRASSLAND', 'DESERT', 'TROPICAL', 'TUNDRA', 'VOLCANIC'];
    this.worldTiers = preset.map((key, idx) => ({
      biomeKey: key,
      tierLevel: this.difficultyTiers[idx],
      biomeData: CONFIG.BIOMES[key]
    }));
    this.currentTierIndex = 0;
  }

  // Shuffle world configuration on Rebirth
  shuffleWorld(rebirthSeed = 1) {
    // Fisher-Yates shuffle
    const shuffledKeys = [...this.biomeKeys];
    for (let i = shuffledKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
    }

    this.worldTiers = shuffledKeys.map((key, idx) => ({
      biomeKey: key,
      tierLevel: this.difficultyTiers[idx],
      biomeData: CONFIG.BIOMES[key]
    }));

    // Player always starts in the tier 20 biome of this rebirth!
    this.currentTierIndex = 0;
  }

  get currentWorldTier() {
    return this.worldTiers[this.currentTierIndex];
  }

  get currentBiome() {
    return this.currentWorldTier.biomeData;
  }

  get currentTierLevel() {
    return this.currentWorldTier.tierLevel;
  }

  advanceToNextTier() {
    if (this.currentTierIndex < this.worldTiers.length - 1) {
      this.currentTierIndex += 1;
      return true;
    }
    return false; // Reached world end (Tier 100 Boss cleared)
  }
}
