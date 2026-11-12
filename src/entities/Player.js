// Player Class - Warrior

import { Entity } from './Entity.js';
import { StatSystem } from '../systems/StatSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { CONFIG } from '../config.js';
import { audio } from '../engine/Audio.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 16);
    this.classKey = 'WARRIOR';
    this.classData = CONFIG.CLASSES.WARRIOR;
    
    // Systems
    this.statSystem = new StatSystem(this.classData.baseStats);
    this.inventory = new InventorySystem();
    this.skillSystem = new SkillSystem();

    // Progression
    this.level = 1;
    this.exp = 0;
    this.expToNext = 100;
    this.advancementTier = 0; // 0: None, 1: Lv30, 2: Lv60

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
    this.slashAnimTimer = 0; // Timer for slash animation frames
    this.animTime = 0;

    // Visual trails
    this.trails = [];
    this.activeAttacks = []; // Visual slash arcs / slam waves

    this.recalcStats();
    this.hp = this.derived.maxHp;
    this.mp = this.derived.maxMp;
  }

  recalcStats() {
    const equipStats = this.inventory.getEquipStats();
    this.derived = this.statSystem.computeDerived(this.level, equipStats);
    // WarCry buff boost
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
      this.expToNext = Math.floor(100 * Math.pow(1.14, this.level - 1));
      this.statSystem.addUnallocatedPoints(CONFIG.STAT_POINTS_PER_LEVEL);
      
      // Check Job Advancements
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

  update(dt, input, monsters, dropItems, floatingTexts, particles) {
    if (this.isDead) return;

    this.animTime += dt;
    this.recalcStats();
    this.skillSystem.update(dt, this.derived.cdr);

    // HP & MP natural regen
    this.hp = Math.min(this.derived.maxHp, this.hp + (this.derived.maxHp * 0.015 + 2) * dt);
    this.mp = Math.min(this.derived.maxMp, this.mp + (this.derived.maxMp * 0.05 + 5) * dt);

    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.slashAnimTimer > 0) this.slashAnimTimer -= dt;

    // Handle Dash mobility
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashDir.x * this.skillSystem.skills.DASH.speed * dt;
      this.y += this.dashDir.y * this.skillSystem.skills.DASH.speed * dt;
      this.trails.push({ x: this.x, y: this.y, life: 0.15, maxLife: 0.15 });

      // Deal slight collision damage while dashing
      monsters.forEach(m => {
        if (m.alive && this.distanceTo(m) < this.radius + m.radius + 15) {
          this.applyDamageToMonster(m, this.derived.minDmg * 0.8, floatingTexts, particles, false);
        }
      });
      return;
    }

    // Movement via Virtual Joystick or WASD
    let mx = input.moveX;
    let my = input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0.1) {
      mx /= len;
      my /= len;
      const spd = this.derived.moveSpeed;
      this.vx = mx * spd;
      this.vy = my * spd;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.facing = mx >= 0 ? 1 : -1;
      this.targetAngle = Math.atan2(my, mx);
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // Whirlwind active spinning
    if (this.whirlwindTimer > 0) {
      this.whirlwindTimer -= dt;
      this.whirlwindHitTimer = (this.whirlwindHitTimer || 0) - dt;
      if (this.whirlwindHitTimer <= 0) {
        this.whirlwindHitTimer = 0.12; // Hit every 0.12s
        audio.playHit();
        const range = this.skillSystem.skills.WHIRLWIND.range;
        monsters.forEach(m => {
          if (m.alive && this.distanceTo(m) < range) {
            const dmg = (this.derived.minDmg + Math.random() * (this.derived.maxDmg - this.derived.minDmg)) * 0.75;
            this.applyDamageToMonster(m, dmg, floatingTexts, particles, true);
          }
        });
        // Particle ring
        particles.spawnWhirlwindRing(this.x, this.y, range);
      }
    }

    // Update active attacks visual animations
    for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
      const atk = this.activeAttacks[i];
      atk.life -= dt;
      if (atk.life <= 0) this.activeAttacks.splice(i, 1);
    }

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].life -= dt;
      if (this.trails[i].life <= 0) this.trails.splice(i, 1);
    }

    // Handle Skill Actions triggered by Input
    this.handleSkills(input, monsters, floatingTexts, particles);
  }

  handleSkills(input, monsters, floatingTexts, particles) {
    // 1. Slash (Basic Attack)
    if (input.triggerSlash && this.skillSystem.canCast('SLASH', this.mp)) {
      this.skillSystem.cast('SLASH', this.derived.cdr);
      this.slashAnimTimer = 0.22; // 3-frame attack animation duration
      audio.playSlash();
      const range = this.skillSystem.skills.SLASH.range;
      const angle = this.targetAngle;

      this.activeAttacks.push({
        type: 'SLASH',
        x: this.x,
        y: this.y,
        angle,
        radius: range,
        life: 0.18,
        maxLife: 0.18
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

    // 2. Whirlwind
    if (input.triggerWhirlwind && this.skillSystem.canCast('WHIRLWIND', this.mp)) {
      this.skillSystem.cast('WHIRLWIND', this.derived.cdr);
      this.mp -= this.skillSystem.skills.WHIRLWIND.cost;
      audio.playWhirlwind();
      this.whirlwindTimer = 1.2; // Spin for 1.2 seconds
    }

    // 3. Dash
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

    // 4. Ground Slam
    if (input.triggerSlam && this.skillSystem.canCast('GROUND_SLAM', this.mp)) {
      this.skillSystem.cast('GROUND_SLAM', this.derived.cdr);
      this.mp -= this.skillSystem.skills.GROUND_SLAM.cost;
      audio.playSlam();
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

    // 5. War Cry
    if (input.triggerWarCry && this.skillSystem.canCast('WAR_CRY', this.mp)) {
      this.skillSystem.cast('WAR_CRY', this.derived.cdr);
      this.mp -= this.skillSystem.skills.WAR_CRY.cost;
      audio.playWarCry();
      particles.spawnWarCryAura(this.x, this.y);
      floatingTexts.push({ x: this.x, y: this.y - 30, text: '전투 함성!!', color: '#ffcc00', life: 1.0 });
    }
  }

  applyDamageToMonster(monster, rawDmg, floatingTexts, particles, canCrit = true, stun = false) {
    const isCrit = canCrit && (Math.random() * 100 < this.derived.critChance);
    let finalDmg = Math.max(1, rawDmg - monster.defense * 0.4);
    if (isCrit) {
      finalDmg *= (this.derived.critDamage / 100);
    }
    finalDmg = Math.floor(finalDmg);

    monster.takeDamage(finalDmg, isCrit, stun);
    audio.playHit();

    // Floating combat text
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

  takeDamage(amount, floatingTexts, particles) {
    if (this.invincibleTimer > 0 || this.isDead) return;
    const reduced = Math.max(1, Math.floor(amount - this.derived.defense * 0.4));
    this.hp -= reduced;
    this.invincibleTimer = 0.4; // 0.4s immunity

    audio.playHit();
    floatingTexts.push({
      x: this.x,
      y: this.y - 28,
      text: `-${reduced}`,
      color: '#ff4444',
      scale: 1.1,
      life: 0.7
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
  }
}
