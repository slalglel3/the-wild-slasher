// Main Game Controller & Orchestrator (120x120 Expanded World, Respawn & Revive)

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
import { DropItem } from '../entities/DropItem.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.particles = new ParticleEngine();
    this.biomeManager = new BiomeManager();
    // 120x120 Expanded World (approx. 10x larger area than 42x42)
    this.mapGenerator = new MapGenerator(120, 120);
    this.rebirthSystem = new RebirthSystem();
    this.bot = new PlaytestBot(this);
    this.botActive = false;

    // Entities & World State
    this.player = null;
    this.map = null;
    this.monsters = [];
    this.respawnQueue = []; // Queue for continuous monster/boss respawning
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

    // Generate large procedural map
    this.map = this.mapGenerator.generate(biome, tier);
    this.bossDefeated = false;
    this.monsters = [];
    this.respawnQueue = [];
    this.dropItems = [];
    this.floatingTexts = [];

    // Spawn player at map start position (World coords)
    const spawnX = this.map.startPos.c * 32;
    const spawnY = this.map.startPos.r * 32;

    if (!this.player) {
      this.player = new Player(spawnX, spawnY);
    } else {
      this.player.x = spawnX;
      this.player.y = spawnY;
      this.player.isDead = false;
    }

    // Spawn initial monsters
    this.map.monsterSpawns.forEach(sp => {
      const mType = biome.monsterTypes[Math.floor(Math.random() * biome.monsterTypes.length)];
      const mx = sp.c * 32;
      const my = sp.r * 32;
      this.monsters.push(new Monster(mx, my, mType, tier, false, diffFactor));
    });

    // Spawn Boss near Gate
    const bossKey = biome.boss;
    const bx = (this.map.portalPos.c - 3) * 32;
    const by = (this.map.portalPos.r - 3) * 32;
    this.monsters.push(new Monster(bx, by, bossKey, tier, true, diffFactor));

    this.floatingTexts.push({
      x: spawnX,
      y: spawnY - 40,
      text: `[${biome.name}] 진입 (Tier ${tier})`,
      color: '#ffd700',
      scale: 1.4,
      life: 2.5
    });
  }

  // Continuous Respawn Controller
  updateRespawnQueue(dt) {
    const biome = this.biomeManager.currentBiome;
    const tier = this.biomeManager.currentTierLevel;
    const diffFactor = this.rebirthSystem.getDifficultyFactor(tier);

    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const item = this.respawnQueue[i];
      item.timer -= dt;

      if (item.timer <= 0) {
        this.respawnQueue.splice(i, 1);
        if (item.isBoss) {
          // Respawn Boss near gate altar
          const bx = (this.map.portalPos.c - 3) * 32;
          const by = (this.map.portalPos.r - 3) * 32;
          this.monsters.push(new Monster(bx, by, item.key, tier, true, diffFactor));
          this.floatingTexts.push({
            x: bx, y: by - 40,
            text: `[보스] ${item.key}가 재출현했습니다!`,
            color: '#ff2222',
            scale: 1.3,
            life: 2.0
          });
        } else {
          // Respawn regular monster in random walkable cell away from player
          let spawnC = Math.floor(4 + Math.random() * (this.map.cols - 8));
          let spawnR = Math.floor(4 + Math.random() * (this.map.rows - 8));
          if (this.map.grid[spawnR] && this.map.grid[spawnR][spawnC] === 0) {
            const mx = spawnC * 32;
            const my = spawnR * 32;
            this.monsters.push(new Monster(mx, my, item.key, tier, false, diffFactor));
          }
        }
      }
    }
  }

  // Player Death Callback
  onPlayerDeath() {
    audio.playHit();
    if (this.uiManager) {
      this.uiManager.openModal('REVIVE');
    }
  }

  // Execute Revive with 20% Exp penalty
  executeRevive() {
    if (!this.player) return;
    this.player.penalizeOnRevive();

    // Teleport to safe start position
    this.player.x = this.map.startPos.c * 32;
    this.player.y = this.map.startPos.r * 32;

    audio.playLevelUp();
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 45,
      text: '부활 완료! (경험치 20% 손실)',
      color: '#ffdd44',
      scale: 1.3,
      life: 2.0
    });
    this.uiManager.closeModal();
  }

  advanceToNextBiome() {
    audio.playLevelUp();
    const hasNext = this.biomeManager.advanceToNextTier();
    if (hasNext) {
      this.loadBiomeWorld();
    } else {
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

    if (this.input.toggleStats) this.uiManager.toggleModal('STATS');
    if (this.input.toggleInventory) this.uiManager.toggleModal('INVENTORY');
    if (this.input.toggleRebirth) this.uiManager.toggleModal('REBIRTH');
    if (this.input.toggleBot) this.toggleBot();

    // 2. Autonomous Bot
    if (this.botActive) {
      this.bot.update(dt);
    }

    // 3. Update Player with Map Boundaries & Collisions
    this.player.update(dt, this.input, this.map, this.monsters, this.dropItems, this.floatingTexts, this.particles, this);

    // 4. Update Monsters & Respawn
    let bossAlive = false;
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.alive) {
        if (m.isBoss) bossAlive = true;
        m.update(dt, this.player, this.floatingTexts, this.particles, this.dropItems, this);
      } else {
        m.onDeath(this.player, this.dropItems, this.floatingTexts, this.particles);
        
        // Push to respawn queue (normal: 14s, boss: 85s)
        this.respawnQueue.push({
          key: m.key,
          isBoss: m.isBoss,
          timer: m.isBoss ? 85.0 : 14.0
        });

        this.monsters.splice(i, 1);
        if (this.botActive) this.bot.stats.monstersKilled++;
      }
    }
    if (!bossAlive) this.bossDefeated = true;

    // Continuous monster respawn tick
    this.updateRespawnQueue(dt);

    // 5. Update Interactive Treasure Chests
    this.updateChests(dt);

    // 5. Check World Highway Gateway Interaction (Path to Next World)
    const gateTargetX = this.map.portalPos.c * 32;
    const gateTargetY = this.map.portalPos.r * 32;
    const distToGate = Math.hypot(this.player.x - gateTargetX, this.player.y - gateTargetY);

    // Instant smooth trigger as soon as player steps into the open highway road
    if (distToGate < 45 && this.bossDefeated) {
      this.advanceToNextBiome();
    }

    // 6. Update Drop Items
    for (let i = this.dropItems.length - 1; i >= 0; i--) {
      const drop = this.dropItems[i];
      drop.update(dt, this.player, this.player.inventory, this.floatingTexts);
      if (!drop.alive) {
        this.dropItems.splice(i, 1);
        if (this.botActive) this.bot.stats.itemsLooted++;
      }
    }

    // 7. Update Particles & Ambience
    this.particles.update(dt);
    this.particles.spawnAmbient(this.renderer.camera, this.biomeManager.currentBiome.id, this.canvas.width, this.canvas.height);

    // 8. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 25 * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 9. Update UI HUD
    this.uiManager.updateHUD();

    // 10. Render Frame (including Minimap)
    this.renderer.render(this);

    this.input.consumeTriggers();
    requestAnimationFrame((t) => this.loop(t));
  }

  // Interactive Chests: Open on proximity or attack hit to shower Diablo-tier loot
  updateChests(dt) {
    if (!this.map || !this.map.chests || !this.player) return;
    const p = this.player;

    this.map.chests.forEach(ch => {
      if (ch.opened) return;
      const chX = ch.c * 32 + 16;
      const chY = ch.r * 32 + 16;
      const dist = Math.hypot(p.x - chX, p.y - chY);

      let triggered = dist < 42;

      if (!triggered && p.activeAttacks) {
        for (const atk of p.activeAttacks) {
          if (Math.hypot(atk.x - chX, atk.y - chY) <= (atk.radius || 40)) {
            triggered = true;
            break;
          }
        }
      }

      if (triggered) {
        ch.opened = true;
        audio.playChestOpen();
        this.particles.spawnChestOpenFX(chX, chY);

        // Diablo-style loot: 2 to 3 high-tier items
        const dropCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < dropCount; i++) {
          const itemTier = this.biomeManager.currentTierLevel;
          const item = p.inventory.rollItem(itemTier);
          this.dropItems.push(new DropItem(
            chX + (Math.random() * 30 - 15),
            chY + (Math.random() * 30 - 15),
            item
          ));
        }

        const bonusExp = Math.floor(120 + this.biomeManager.currentTierLevel * 10);
        p.addExp(bonusExp, this.floatingTexts);

        this.floatingTexts.push({
          x: chX,
          y: chY - 35,
          text: '★ 보물 상자 개방! 장비 획득! ★',
          color: '#ffd700',
          scale: 1.25,
          life: 1.8
        });
      }
    });
  }
}
