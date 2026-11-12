// Autonomous QA & Playtest Bot (Self-Playing Agent)

import { CONFIG } from '../config.js';

export class PlaytestBot {
  constructor(game) {
    this.game = game;
    this.stats = {
      monstersKilled: 0,
      skillsUsed: 0,
      itemsLooted: 0,
      rebirthsTriggered: 0,
      biomesCleared: 0,
      ticksRun: 0
    };
  }

  update(dt) {
    const game = this.game;
    const player = game.player;
    if (player.isDead) return;

    this.stats.ticksRun++;

    // 1. Auto-allocate unallocated stat points (Warrior: STR 60%, VIT 40%)
    if (player.statSystem.unallocatedPoints > 0) {
      if (Math.random() < 0.65) {
        player.statSystem.allocate('STR', 1);
      } else {
        player.statSystem.allocate('VIT', 1);
      }
      player.recalcStats();
    }

    // 2. Find nearest alive monster
    let nearestMonster = null;
    let minDist = 999999;
    game.monsters.forEach(m => {
      if (m.alive) {
        const d = player.distanceTo(m);
        if (d < minDist) {
          minDist = d;
          nearestMonster = m;
        }
      }
    });

    // 3. Combat or Navigation AI
    if (nearestMonster) {
      const angle = player.angleTo(nearestMonster);
      const dist = minDist;

      // Rotate player towards target
      player.targetAngle = angle;
      player.facing = Math.cos(angle) >= 0 ? 1 : -1;

      if (dist > 50) {
        // Move towards monster
        game.input.moveX = Math.cos(angle);
        game.input.moveY = Math.sin(angle);
      } else {
        // Stop and Attack
        game.input.moveX = 0;
        game.input.moveY = 0;
      }

      // Combo Skill Decisions
      if (dist < 110 && player.skillSystem.canCast('WHIRLWIND', player.mp)) {
        game.input.triggerWhirlwind = true;
        this.stats.skillsUsed++;
      } else if (dist < 120 && player.skillSystem.canCast('GROUND_SLAM', player.mp)) {
        game.input.triggerSlam = true;
        this.stats.skillsUsed++;
      } else if (dist > 140 && dist < 300 && player.skillSystem.canCast('DASH', player.mp)) {
        game.input.triggerDash = true;
        this.stats.skillsUsed++;
      } else {
        // Basic attack
        game.input.triggerSlash = true;
      }

      // War Cry buff maintenance
      if (player.skillSystem.canCast('WAR_CRY', player.mp)) {
        game.input.triggerWarCry = true;
        this.stats.skillsUsed++;
      }
    } else {
      // All monsters dead in area -> Move towards Portal / Altar!
      const map = game.map;
      const halfW = CONFIG.TILE_WIDTH / 2;
      const halfH = CONFIG.TILE_HEIGHT / 2;
      // Convert portal grid to world coords
      const portalTargetX = map.portalPos.c * 32;
      const portalTargetY = map.portalPos.r * 32;

      const pDist = Math.hypot(portalTargetX - player.x, portalTargetY - player.y);
      if (pDist > 40) {
        const pAng = Math.atan2(portalTargetY - player.y, portalTargetX - player.x);
        game.input.moveX = Math.cos(pAng);
        game.input.moveY = Math.sin(pAng);
      } else {
        // Interacting with portal
        if (game.bossDefeated) {
          game.advanceToNextBiome();
          this.stats.biomesCleared++;
        }
      }
    }

    // Auto Rebirth when high level or tested
    if (player.level >= 80 && game.rebirthSystem.canRebirth(player.level)) {
      game.executeRebirth();
      this.stats.rebirthsTriggered++;
    }
  }
}
