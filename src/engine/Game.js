// Main Game Controller & Orchestrator

import { CONFIG } from '../config.js';
import { Renderer } from './Renderer.js';
import { InputManager } from './Input.js';
import { ParticleEngine } from './Particles.js';
import { BiomeManager } from '../world/BiomeManager.js';
import { MapGenerator } from '../world/MapGenerator.js';
import { RebirthSystem } from '../systems/RebirthSystem.js';
import { Player } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import { UIManager } from '../ui/UIManager.js';
import { PlaytestBot } from './Bot.js';
import { audio } from './Audio.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.particles = new ParticleEngine();
    this.biomeManager = new BiomeManager();
    this.mapGenerator = new MapGenerator(42, 42);
    this.rebirthSystem = new RebirthSystem();
    this.bot = new PlaytestBot(this);
    this.botActive = false;

    // Entities & World State
    this.player = null;
    this.map = null;
    this.monsters = [];
    this.dropItems = [];
    this.floatingTexts = [];
    this.bossDefeated = false;

    // Time keeping
    this.lastTime = performance.now();
    this.uiManager = null;
  }

  init() {
    this.uiManager = new UIManager(this);

    // Initial map and player spawn
    this.loadBiomeWorld();

    // Start Audio on first user interaction
    const unlockAudio = () => {
      audio.init();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Start main game loop
    requestAnimationFrame((t) => this.loop(t));
  }

  loadBiomeWorld() {
    const biome = this.biomeManager.currentBiome;
    const tier = this.biomeManager.currentTierLevel;
    const diffFactor = this.rebirthSystem.getDifficultyFactor(tier);

    // Generate procedural map
    this.map = this.mapGenerator.generate(biome, tier);
    this.bossDefeated = false;
    this.monsters = [];
    this.dropItems = [];
    this.floatingTexts = [];

    // Spawn player at map start position (World coords)
    // Map tile to world coords factor: 32px per grid unit
    const spawnX = this.map.startPos.c * 32;
    const spawnY = this.map.startPos.r * 32;

    if (!this.player) {
      this.player = new Player(spawnX, spawnY);
    } else {
      this.player.x = spawnX;
      this.player.y = spawnY;
    }

    // Spawn regular monsters from biome monster pool
    this.map.monsterSpawns.forEach(sp => {
      const mType = biome.monsterTypes[Math.floor(Math.random() * biome.monsterTypes.length)];
      const mx = sp.c * 32;
      const my = sp.r * 32;
      this.monsters.push(new Monster(mx, my, mType, tier, false, diffFactor));
    });

    // Spawn Area Boss near Portal
    const bossKey = biome.boss;
    const bx = (this.map.portalPos.c - 2) * 32;
    const by = (this.map.portalPos.r - 2) * 32;
    this.monsters.push(new Monster(bx, by, bossKey, tier, true, diffFactor));

    this.floatingTexts.push({
      x: spawnX,
      y: spawnY - 40,
      text: `[${biome.name}] 진입 (Tier ${tier})`,
      color: '#ffd700',
      scale: 1.4,
      life: 2.0
    });
  }

  advanceToNextBiome() {
    audio.playLevelUp();
    const hasNext = this.biomeManager.advanceToNextTier();
    if (hasNext) {
      this.loadBiomeWorld();
    } else {
      // Cleared Tier 100 Boss!
      this.floatingTexts.push({
        x: this.player.x,
        y: this.player.y - 40,
        text: `★ 월드 정복 완료! 환생을 준비하세요! ★`,
        color: '#ff00ff',
        scale: 1.6,
        life: 3.5
      });
      this.uiManager.openModal('REBIRTH');
    }
  }

  executeRebirth(newClass = 'WARRIOR') {
    audio.playRebirth();
    const result = this.rebirthSystem.performRebirth(this.player, this.biomeManager, newClass);
    this.loadBiomeWorld();
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 50,
      text: `환생 성공! (+${result.bonusStatsGiven}pt 영구 스탯 획득)`,
      color: '#00ffff',
      scale: 1.5,
      life: 2.5
    });
    this.uiManager.updateHUD();
  }

  toggleBot() {
    this.botActive = !this.botActive;
    audio.playClick();
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 35,
      text: this.botActive ? '🤖 QA 자율 봇 가동!' : '🤖 QA 봇 중지',
      color: this.botActive ? '#00ffff' : '#ffaa00',
      scale: 1.2,
      life: 1.2
    });
  }

  loop(currentTime) {
    const dt = Math.min(0.064, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // 1. Process Input
    this.input.update();

    // 2. Check UI shortcut triggers
    if (this.input.toggleStats) this.uiManager.toggleModal('STATS');
    if (this.input.toggleInventory) this.uiManager.toggleModal('INVENTORY');
    if (this.input.toggleRebirth) this.uiManager.toggleModal('REBIRTH');
    if (this.input.toggleBot) this.toggleBot();

    // 3. Autonomous Bot logic (if active)
    if (this.botActive) {
      this.bot.update(dt);
    }

    // 4. Update Player
    this.player.update(dt, this.input, this.monsters, this.dropItems, this.floatingTexts, this.particles);

    // 5. Update Monsters
    let bossAlive = false;
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.alive) {
        if (m.isBoss) bossAlive = true;
        m.update(dt, this.player, this.floatingTexts, this.particles, this.dropItems);
      } else {
        m.onDeath(this.player, this.dropItems, this.floatingTexts, this.particles);
        this.monsters.splice(i, 1);
        if (this.botActive) this.bot.stats.monstersKilled++;
      }
    }
    if (!bossAlive) this.bossDefeated = true;

    // 6. Check Portal interaction
    const pGridC = Math.floor(this.player.x / 32);
    const pGridR = Math.floor(this.player.y / 32);
    const portalDist = Math.hypot(pGridC - this.map.portalPos.c, pGridR - this.map.portalPos.r);
    if (portalDist < 3 && this.bossDefeated) {
      this.advanceToNextBiome();
    }

    // 7. Update Drop Items
    for (let i = this.dropItems.length - 1; i >= 0; i--) {
      const drop = this.dropItems[i];
      drop.update(dt, this.player, this.player.inventory, this.floatingTexts);
      if (!drop.alive) {
        this.dropItems.splice(i, 1);
        if (this.botActive) this.bot.stats.itemsLooted++;
      }
    }

    // 8. Update Particles & Ambience
    this.particles.update(dt);
    this.particles.spawnAmbient(this.renderer.camera, this.biomeManager.currentBiome.id, this.canvas.width, this.canvas.height);

    // 9. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 25 * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 10. Update UI HUD
    this.uiManager.updateHUD();

    // 11. Render Frame
    this.renderer.render(this);

    // Consume single-frame inputs
    this.input.consumeTriggers();

    requestAnimationFrame((t) => this.loop(t));
  }
}
