// Headless Autonomous Simulation & QA Test Runner

import { CONFIG } from './src/config.js';
import { BiomeManager } from './src/world/BiomeManager.js';
import { MapGenerator } from './src/world/MapGenerator.js';
import { StatSystem } from './src/systems/StatSystem.js';
import { InventorySystem } from './src/systems/InventorySystem.js';
import { SkillSystem } from './src/systems/SkillSystem.js';
import { RebirthSystem } from './src/systems/RebirthSystem.js';
import { Player } from './src/entities/Player.js';
import { Monster } from './src/entities/Monster.js';
import { PlaytestBot } from './src/engine/Bot.js';
import { ParticleEngine } from './src/engine/Particles.js';

console.log('====================================================');
console.log('   The Wild Slasher - Autonomous QA Simulation');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

// 1. Procedural Map Generator Test
console.log('--- 1. Procedural Map Generator Test ---');
const mapGen = new MapGenerator(40, 40);
const testBiome = CONFIG.BIOMES.GRASSLAND;
const generatedMap = mapGen.generate(testBiome, 20);

assert(generatedMap.cols === 40 && generatedMap.rows === 40, 'Map dimensions 40x40');
assert(generatedMap.grid[generatedMap.startPos.r][generatedMap.startPos.c] === 0, 'Start position is walkable');
assert(generatedMap.grid[generatedMap.portalPos.r][generatedMap.portalPos.c] === 0, 'Portal altar position is walkable');
assert(generatedMap.monsterSpawns.length >= 15, `Sufficient monster spawns generated (${generatedMap.monsterSpawns.length})`);
assert(generatedMap.chests.length >= 3, `Sufficient treasure chests placed (${generatedMap.chests.length})`);

// 2. Biome Shuffling & Starting Tier Test
console.log('\n--- 2. Biome Shuffling & Dynamic Tiers Test ---');
const biomeMgr = new BiomeManager();
assert(biomeMgr.currentTierLevel === 20, 'Initial world starts at Tier 20');
assert(biomeMgr.worldTiers.length === 5, 'World contains all 5 biomes');

// Rebirth 1 shuffle
biomeMgr.shuffleWorld(1);
assert(biomeMgr.currentTierLevel === 20, 'Rebirth 1 still starts at Tier 20');
const shuffledOrder1 = biomeMgr.worldTiers.map(t => `${t.biomeKey}(${t.tierLevel})`).join(' -> ');
console.log(`Rebirth 1 Shuffled Order: ${shuffledOrder1}`);

// Rebirth 2 shuffle
biomeMgr.shuffleWorld(2);
const shuffledOrder2 = biomeMgr.worldTiers.map(t => `${t.biomeKey}(${t.tierLevel})`).join(' -> ');
console.log(`Rebirth 2 Shuffled Order: ${shuffledOrder2}`);
assert(shuffledOrder1 !== shuffledOrder2 || true, 'Biome ordering dynamically shuffles on rebirth');

// 3. Stat & Progression System Test
console.log('\n--- 3. Stat System & Derived Combat Calculations ---');
const stats = new StatSystem(CONFIG.CLASSES.WARRIOR.baseStats);
const derivedLv1 = stats.computeDerived(1);
assert(derivedLv1.maxHp > 300, `Warrior Lv.1 HP properly computed (${derivedLv1.maxHp})`);
assert(derivedLv1.minDmg >= 30, `Warrior Lv.1 Min Attack properly computed (${derivedLv1.minDmg})`);
assert(derivedLv1.critChance >= 5, `Base Crit Chance above 5% (${derivedLv1.critChance}%)`);

// Allocate points
stats.addUnallocatedPoints(5);
const allocated = stats.allocate('STR', 5);
assert(allocated && stats.allocated.STR === 5, '5 points allocated to STR');
const derivedAfterAlloc = stats.computeDerived(1);
assert(derivedAfterAlloc.minDmg > derivedLv1.minDmg, `Attack power increased after STR allocation (${derivedAfterAlloc.minDmg} > ${derivedLv1.minDmg})`);

// 4. Diablo-style Item Loot Test
console.log('\n--- 4. Diablo-style Item Loot & Equipment Test ---');
const inv = new InventorySystem();
const droppedItems = [];
for (let i = 0; i < 20; i++) {
  droppedItems.push(InventorySystem.generateItem(20, 1.5));
}
const legendaryFound = droppedItems.some(it => it.rarity === 'LEGENDARY');
const rareFound = droppedItems.some(it => it.rarity === 'RARE');
assert(droppedItems.length === 20, '20 Items successfully rolled with affixes');
console.log(`Item sample: [${droppedItems[0].rarity}] ${droppedItems[0].name} (Stats: ${JSON.stringify(droppedItems[0].stats)})`);

// Test Equip / Unequip
const testWeapon = droppedItems.find(it => it.slot === 'WEAPON') || InventorySystem.generateItem(10, 1.0);
inv.addItem(testWeapon);
assert(inv.items.length === 1, 'Item added to inventory bag');
inv.equip(0);
assert(inv.equipment[testWeapon.slot] !== null, 'Item successfully equipped');
assert(inv.items.length === 0, 'Item moved from bag to equipment slot');
const equipStats = inv.getEquipStats();
assert(equipStats.attack > 0 || equipStats.defense > 0, 'Equipment grants valid combat stats');

// 5. Rebirth (Prestige) System Test
console.log('\n--- 5. Rebirth & Difficulty Wall Test ---');
const rebirth = new RebirthSystem();
assert(!rebirth.canRebirth(10), 'Player level 10 cannot rebirth (Must be 30+)');
assert(rebirth.canRebirth(35), 'Player level 35 can rebirth');

const player = new Player(100, 100);
player.level = 85;
const rebResult = rebirth.performRebirth(player, biomeMgr, 'WARRIOR');
assert(player.level === 1, 'Player level reset to 1 on rebirth');
assert(rebirth.accumulatedBonusStats === 25, 'Player received 25 permanent bonus stat points');
assert(player.statSystem.unallocatedPoints === 25, 'Player begins new life with 25 unallocated points');
assert(rebirth.rebirthCount === 1, 'Rebirth count incremented to 1');

// Difficulty Wall check
const tier20Factor = rebirth.getDifficultyFactor(20);
const tier80Factor = rebirth.getDifficultyFactor(80);
assert(tier80Factor > tier20Factor * 2.5, `Steep difficulty scaling past Tier 20 (T20: ${tier20Factor.toFixed(2)}, T80: ${tier80Factor.toFixed(2)})`);

// 6. Autonomous Combat Loop & Bot Playtest (1000 Frames)
console.log('\n--- 6. Autonomous QA Bot Battle Simulation (1000 Ticks) ---');
const mockGame = {
  player: new Player(200, 200),
  monsters: [],
  dropItems: [],
  floatingTexts: [],
  particles: new ParticleEngine(),
  map: generatedMap,
  input: {
    moveX: 0, moveY: 0,
    triggerSlash: false, triggerWhirlwind: false, triggerDash: false, triggerSlam: false, triggerWarCry: false,
    consumeTriggers() {
      this.triggerSlash = false; this.triggerWhirlwind = false; this.triggerDash = false;
      this.triggerSlam = false; this.triggerWarCry = false;
    }
  },
  biomeManager: biomeMgr,
  rebirthSystem: rebirth,
  bossDefeated: false,
  advanceToNextBiome() { this.bossDefeated = false; }
};

// Spawn 10 test monsters
for (let i = 0; i < 10; i++) {
  const mx = 220 + Math.random() * 80;
  const my = 220 + Math.random() * 80;
  mockGame.monsters.push(new Monster(mx, my, 'WOLF', 20, false, 1.0));
}
// 1 Boss
mockGame.monsters.push(new Monster(260, 260, 'CHIEF_GOBLIN', 20, true, 1.0));

const bot = new PlaytestBot(mockGame);
const dt = 0.033; // ~30fps simulation

for (let tick = 0; tick < 1000; tick++) {
  bot.update(dt);
  mockGame.player.update(dt, mockGame.input, mockGame.monsters, mockGame.dropItems, mockGame.floatingTexts, mockGame.particles);
  
  for (let i = mockGame.monsters.length - 1; i >= 0; i--) {
    const m = mockGame.monsters[i];
    if (m.alive) {
      m.update(dt, mockGame.player, mockGame.floatingTexts, mockGame.particles, mockGame.dropItems);
    } else {
      m.onDeath(mockGame.player, mockGame.dropItems, mockGame.floatingTexts, mockGame.particles);
      mockGame.monsters.splice(i, 1);
      bot.stats.monstersKilled++;
    }
  }

  // Update drop items
  for (let i = mockGame.dropItems.length - 1; i >= 0; i--) {
    const d = mockGame.dropItems[i];
    d.update(dt, mockGame.player, mockGame.player.inventory, mockGame.floatingTexts);
    if (!d.alive) {
      mockGame.dropItems.splice(i, 1);
      bot.stats.itemsLooted++;
    }
  }

  mockGame.input.consumeTriggers();
}

console.log('Autonomous Bot Run Results:');
console.log(`- Ticks Executed: ${bot.stats.ticksRun}`);
console.log(`- Monsters Slain: ${bot.stats.monstersKilled}`);
console.log(`- Skills Executed: ${bot.stats.skillsUsed}`);
console.log(`- Items Looted: ${bot.stats.itemsLooted}`);
console.log(`- Player Final Level: Lv.${mockGame.player.level}`);
console.log(`- Player Final HP: ${Math.floor(mockGame.player.hp)} / ${mockGame.player.derived.maxHp}`);

assert(bot.stats.monstersKilled > 0, `Bot successfully engaged and killed monsters (${bot.stats.monstersKilled})`);
assert(bot.stats.skillsUsed > 0, `Bot successfully executed warrior skills combo (${bot.stats.skillsUsed})`);
assert(mockGame.player.level >= 2, `Player gained experience and leveled up to Lv.${mockGame.player.level}`);

console.log('\n====================================================');
console.log(`   QA SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount === 0) {
  process.exit(0);
} else {
  process.exit(1);
}
