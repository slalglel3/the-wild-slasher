// Player Class - Warrior with Clamping, Obstacle Collision & Animation Frame Controller

import { Entity } from './Entity.js';
import { StatSystem } from '../systems/StatSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { CONFIG } from '../config.js';
import { audio } from '../engine/Audio.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 14);
    this.classKey = 'WARRIOR';
    this.classData = CONFIG.CLASSES.WARRIOR;
    
    // Systems
    this.statSystem = new StatSystem(this.classData.baseStats);
    this.inventory = new InventorySystem();
    this.skillSystem = new SkillSystem();

    // Progression - Balanced Leveling
    this.level = 1;
    this.exp = 0;
    this.expToNext = 250; // Slower, more rewarding progression
    this.advancementTier = 0;

    // Vitals
    this.hp = 100;
    this.mp = 100;
    this.isDead = false;

    // Movement & Combat States
    this.moveVec = { x: 0, y: 0 };
    this.targetAngle = 0;
    this.invincibleTimer = 0;
    this.dashTimer = 0;
    this.whirlwindTimer = 0;
    this.slashAnimTimer = 0;
    this.slamAnimTimer = 0;
    this.warcryAnimTimer = 0;
    this.hazardTickTimer = 0;
    this.inHazard = false;
    this.game = null;

    // Animation Frame Timers (Accurate leg & arm movement)
    this.runFrame = 0;
    this.runFrameTimer = 0;
    this.animTime = 0;

    // Visual trails
    this.trails = [];
    this.activeAttacks = [];

    this.recalcStats();
    this.hp = this.derived.maxHp;
    this.mp = this.derived.maxMp;
  }

  recalcStats() {
    const equipStats = this.inventory.getEquipStats();
    this.derived = this.statSystem.computeDerived(this.level, equipStats);
    if (this.skillSystem.isBuffActive('WAR_CRY')) {
      this.derived.minDmg = Math.floor(this.derived.minDmg * 1.35);
      this.derived.maxDmg = Math.floor(this.derived.maxDmg * 1.35);
      this.derived.moveSpeed = Math.floor(this.derived.moveSpeed * 1.25);
    }
  }

  addExp(amount) {
    if (this.level >= CONFIG.MAX_LEVEL) return false;
    this.exp += amount;
    let leveledUp = false;

    while (this.exp >= this.expToNext && this.level < CONFIG.MAX_LEVEL) {
      this.exp -= this.expToNext;
      this.level += 1;
      // Exponentially scaling curve for satisfying RPG grinding
      this.expToNext = Math.floor(250 * Math.pow(1.22, this.level - 1));
      this.statSystem.addUnallocatedPoints(CONFIG.STAT_POINTS_PER_LEVEL);
      
      if (this.level === CONFIG.ADVANCEMENT_1_LEVEL && this.advancementTier === 0) {
        this.advancementTier = 1;
      }
      if (this.level === CONFIG.ADVANCEMENT_2_LEVEL && this.advancementTier === 1) {
        this.advancementTier = 2;
      }

      leveledUp = true;
    }

    if (leveledUp) {
      this.recalcStats();
      this.hp = this.derived.maxHp;
      this.mp = this.derived.maxMp;
      audio.playLevelUp();
    }
    return leveledUp;
  }

  // Penalty on Revive: Lose 20% of current accumulated experience
  penalizeOnRevive() {
    this.exp = Math.max(0, Math.floor(this.exp * 0.8));
    this.hp = this.derived.maxHp;
    this.mp = this.derived.maxMp;
    this.isDead = false;
    this.invincibleTimer = 2.0; // 2 seconds safety shield upon revive
  }

  update(dt, input, map, monsters, dropItems, floatingTexts, particles, game) {
    if (this.isDead) return;
    if (game) this.game = game;

    this.animTime += dt;
    this.recalcStats();
    this.skillSystem.update(dt, this.derived.cdr);

    // Natural regen
    this.hp = Math.min(this.derived.maxHp, this.hp + (this.derived.maxHp * 0.015 + 2) * dt);
    this.mp = Math.min(this.derived.maxMp, this.mp + (this.derived.maxMp * 0.05 + 5) * dt);

    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.slashAnimTimer > 0) this.slashAnimTimer -= dt;
    if (this.slamAnimTimer > 0) this.slamAnimTimer -= dt;
    if (this.warcryAnimTimer > 0) this.warcryAnimTimer -= dt;

    // Check Current Tile for Hazards (Poison swamp, lava, etc.)
    const currC = Math.floor(this.x / 32);
    const currR = Math.floor(this.y / 32);
    if (currR >= 0 && currR < map.rows && currC >= 0 && currC < map.cols) {
      if (map.grid[currR][currC] === 3) {
        this.inHazard = true;
        this.hazardTickTimer -= dt;
        if (this.hazardTickTimer <= 0) {
          this.hazardTickTimer = 0.5;
          const hazardDmg = Math.floor(10 + this.level * 2);
          this.takeDamage(hazardDmg, floatingTexts, particles, game, '환경 피해');
        }
      } else {
        this.inHazard = false;
      }
    }

    // Handle Dash mobility with collision checking
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashSpd = this.skillSystem.skills.DASH.speed;
      this.moveWithCollision(this.dashDir.x * dashSpd * dt, this.dashDir.y * dashSpd * dt, map);
      this.trails.push({ x: this.x, y: this.y, life: 0.15, maxLife: 0.15 });

      monsters.forEach(m => {
        if (m.alive && this.distanceTo(m) < this.radius + m.radius + 15) {
          this.applyDamageToMonster(m, this.derived.minDmg * 0.8, floatingTexts, particles, false);
        }
      });
      return;
    }

    // Movement calculation
    let mx = input.moveX;
    let my = input.moveY;
    const len = Math.hypot(mx, my);
    const isMoving = len > 0.1;

    if (isMoving) {
      mx /= len;
      my /= len;
      let spd = this.derived.moveSpeed;
      if (this.inHazard) spd *= 0.6; // 40% slow on hazard tiles

      this.vx = mx * spd;
      this.vy = my * spd;
      this.moveWithCollision(this.vx * dt, this.vy * dt, map);

      this.facing = mx >= 0 ? 1 : -1;
      this.targetAngle = Math.atan2(my, mx);

      // Distinct 4-Frame Run Animation Controller (0.11s per frame)
      this.runFrameTimer += dt;
      if (this.runFrameTimer >= 0.11) {
        this.runFrameTimer = 0;
        this.runFrame = (this.runFrame + 1) % 4;
      }
    } else {
      this.vx = 0;
      this.vy = 0;
      this.runFrame = 0;
      this.runFrameTimer = 0;
    }

    // Whirlwind active spin logic
    if (this.whirlwindTimer > 0) {
      this.whirlwindTimer -= dt;
      this.whirlwindHitTimer = (this.whirlwindHitTimer || 0) - dt;
      if (this.whirlwindHitTimer <= 0) {
        this.whirlwindHitTimer = 0.12;
        audio.playHit();
        const range = this.skillSystem.skills.WHIRLWIND.range;
        monsters.forEach(m => {
          if (m.alive && this.distanceTo(m) < range) {
            const dmg = (this.derived.minDmg + Math.random() * (this.derived.maxDmg - this.derived.minDmg)) * 0.75;
            this.applyDamageToMonster(m, dmg, floatingTexts, particles, true);
          }
        });
        particles.spawnWhirlwindRing(this.x, this.y, range);
      }
    }

    // Update visuals
    for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
      const atk = this.activeAttacks[i];
      atk.life -= dt;
      if (atk.life <= 0) this.activeAttacks.splice(i, 1);
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].life -= dt;
      if (this.trails[i].life <= 0) this.trails.splice(i, 1);
    }

    this.handleSkills(input, monsters, floatingTexts, particles);
  }

  // Clamping to map borders + Smooth Sliding Circle Collision
  moveWithCollision(dx, dy, map) {
    if (!map || !map.grid) {
      this.x += dx;
      this.y += dy;
      return;
    }
    const minBound = 48;
    const maxBoundX = (map.cols - 1.5) * 32;
    const maxBoundY = (map.rows - 1.5) * 32;
    const playerRadius = 10;
    const obstacleRadius = 12;
    const minDist = playerRadius + obstacleRadius; // 22px

    const isColliding = (checkX, checkY) => {
      if (checkX < minBound || checkX > maxBoundX || checkY < minBound || checkY > maxBoundY) {
        return true;
      }
      const centerC = Math.floor(checkX / 32);
      const centerR = Math.floor(checkY / 32);

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = centerR + dr;
          const c = centerC + dc;
          if (r >= 0 && r < map.rows && c >= 0 && c < map.cols) {
            if (map.grid[r][c] === 1) {
              const ox = c * 32 + 16;
              const oy = r * 32 + 16;
              const distSq = (checkX - ox) ** 2 + (checkY - oy) ** 2;
              if (distSq < minDist * minDist) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    // 1. Try full movement
    const targetX = Math.max(minBound, Math.min(maxBoundX, this.x + dx));
    const targetY = Math.max(minBound, Math.min(maxBoundY, this.y + dy));

    if (!isColliding(targetX, targetY)) {
      this.x = targetX;
      this.y = targetY;
      return;
    }

    // 2. Slide along X-axis
    if (!isColliding(targetX, this.y)) {
      this.x = targetX;
    }

    // 3. Slide along Y-axis
    if (!isColliding(this.x, targetY)) {
      this.y = targetY;
    }
  }

  handleSkills(input, monsters, floatingTexts, particles) {
    if (input.triggerSlash && this.skillSystem.canCast('SLASH', this.mp)) {
      this.skillSystem.cast('SLASH', this.derived.cdr);
      this.slashAnimTimer = 0.24;
      audio.playSlash();
      const range = this.skillSystem.skills.SLASH.range;
      const angle = this.targetAngle;

      this.activeAttacks.push({
        type: 'SLASH',
        x: this.x,
        y: this.y,
        angle,
        radius: range,
        life: 0.2,
        maxLife: 0.2
      });

      monsters.forEach(m => {
        if (!m.alive) return;
        const dist = this.distanceTo(m);
        if (dist <= range + m.radius) {
          const diffAng = Math.abs(this.angleTo(m) - angle);
          if (diffAng < Math.PI * 0.45 || diffAng > Math.PI * 1.55) {
            const rawDmg = this.derived.minDmg + Math.random() * (this.derived.maxDmg - this.derived.minDmg);
            this.applyDamageToMonster(m, rawDmg, floatingTexts, particles, true);
          }
        }
      });
    }

    if (input.triggerWhirlwind && this.skillSystem.canCast('WHIRLWIND', this.mp)) {
      this.skillSystem.cast('WHIRLWIND', this.derived.cdr);
      this.mp -= this.skillSystem.skills.WHIRLWIND.cost;
      audio.playWhirlwind();
      this.whirlwindTimer = 1.2;
    }

    if (input.triggerDash && this.skillSystem.canCast('DASH', this.mp)) {
      this.skillSystem.cast('DASH', this.derived.cdr);
      this.mp -= this.skillSystem.skills.DASH.cost;
      audio.playDash();
      this.dashTimer = this.skillSystem.skills.DASH.duration;
      this.invincibleTimer = this.dashTimer + 0.1;
      const len = Math.hypot(input.moveX, input.moveY);
      if (len > 0.1) {
        this.dashDir = { x: input.moveX / len, y: input.moveY / len };
      } else {
        this.dashDir = { x: this.facing, y: 0 };
      }
    }

    if (input.triggerSlam && this.skillSystem.canCast('GROUND_SLAM', this.mp)) {
      this.skillSystem.cast('GROUND_SLAM', this.derived.cdr);
      this.mp -= this.skillSystem.skills.GROUND_SLAM.cost;
      audio.playSlam();
      this.slamAnimTimer = 0.35;
      const range = this.skillSystem.skills.GROUND_SLAM.range;

      this.activeAttacks.push({
        type: 'SLAM',
        x: this.x,
        y: this.y,
        radius: range,
        life: 0.35,
        maxLife: 0.35
      });
      particles.spawnSlamShockwave(this.x, this.y, range);

      monsters.forEach(m => {
        if (m.alive && this.distanceTo(m) <= range) {
          const rawDmg = (this.derived.minDmg + Math.random() * (this.derived.maxDmg - this.derived.minDmg)) * 2.2;
          this.applyDamageToMonster(m, rawDmg, floatingTexts, particles, true, true);
        }
      });
    }

    if (input.triggerWarCry && this.skillSystem.canCast('WAR_CRY', this.mp)) {
      this.skillSystem.cast('WAR_CRY', this.derived.cdr);
      this.mp -= this.skillSystem.skills.WAR_CRY.cost;
      audio.playWarCry();
      this.warcryAnimTimer = 0.5;
      particles.spawnWarCryAura(this.x, this.y);
      floatingTexts.push({ x: this.x, y: this.y - 30, text: '전투 함성!!', color: '#ffcc00', life: 1.0 });
    }
  }

  applyDamageToMonster(monster, rawDmg, floatingTexts, particles, canCrit = true, stun = false) {
    const isCrit = canCrit && (Math.random() * 100 < this.derived.critChance);
    let finalDmg = Math.max(1, rawDmg - monster.defense * 0.4);
    if (isCrit) finalDmg *= (this.derived.critDamage / 100);
    finalDmg = Math.floor(finalDmg);

    monster.takeDamage(finalDmg, isCrit, stun);
    audio.playHit();

    floatingTexts.push({
      x: monster.x + (Math.random() * 20 - 10),
      y: monster.y - 25,
      text: isCrit ? `CRIT! ${finalDmg}` : `${finalDmg}`,
      color: isCrit ? '#ff3333' : '#ffffff',
      scale: isCrit ? 1.4 : 1.0,
      life: 0.75
    });

    particles.spawnBloodSparks(monster.x, monster.y, isCrit ? 12 : 6);
  }

  takeDamage(amount, floatingTexts, particles, game = null, label = null) {
    if (this.invincibleTimer > 0 || this.isDead) return;
    const reduced = Math.max(1, Math.floor(amount - this.derived.defense * 0.4));
    this.hp -= reduced;
    this.invincibleTimer = 0.4;

    audio.playHit();
    floatingTexts.push({
      x: this.x,
      y: this.y - 28,
      text: label ? `${label} -${reduced}` : `-${reduced}`,
      color: '#ff4444',
      scale: 1.1,
      life: 0.7
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      const targetGame = game || this.game;
      if (targetGame && targetGame.onPlayerDeath) {
        targetGame.onPlayerDeath();
      }
    }
  }
}
