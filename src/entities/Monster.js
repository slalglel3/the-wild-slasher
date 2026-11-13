// Monster & Boss AI Entity

import { Entity } from './Entity.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { DropItem } from './DropItem.js';
import { audio } from '../engine/Audio.js';

export class Monster extends Entity {
  constructor(x, y, monsterKey, tierLevel, isBoss = false, diffFactor = 1.0) {
    super(x, y, isBoss ? 28 : 16);
    this.key = monsterKey;
    this.tierLevel = tierLevel;
    this.isBoss = isBoss;

    // Base stats scaled by tier & difficulty factor
    const baseHp = isBoss ? 800 + tierLevel * 300 : 80 + tierLevel * 35;
    const baseAtk = isBoss ? 25 + tierLevel * 9 : 8 + tierLevel * 3.5;
    const baseDef = isBoss ? 15 + tierLevel * 4 : 4 + tierLevel * 1.5;

    this.maxHp = Math.floor(baseHp * diffFactor);
    this.hp = this.maxHp;
    this.attack = Math.floor(baseAtk * diffFactor);
    this.defense = Math.floor(baseDef * diffFactor);
    this.speed = isBoss ? 95 : 110 + Math.random() * 30;

    // AI
    this.attackRange = isBoss ? 45 : 30;
    this.attackCooldown = 0;
    this.attackRate = isBoss ? 1.4 : 1.1;
    this.stunTimer = 0;
    this.hurtTimer = 0;

    // Visual attributes
    this.name = isBoss ? `[보스] ${monsterKey}` : monsterKey;
    this.animTime = Math.random() * 10;
  }

  takeDamage(amount, isCrit = false, stun = false) {
    this.hp -= amount;
    this.hurtTimer = 0.18;
    if (stun) this.stunTimer = 1.2;

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(dt, player, floatingTexts, particles, dropItems, game = null) {
    if (!this.alive) return;

    this.animTime += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dist = this.distanceTo(player);
    const aggroDist = this.isBoss ? 500 : 280;

    // Aggro & Chase player
    if (dist < aggroDist && !player.isDead) {
      this.facing = player.x >= this.x ? 1 : -1;
      const angle = this.angleTo(player);

      if (dist > this.attackRange) {
        // Move towards player
        this.x += Math.cos(angle) * this.speed * dt;
        this.y += Math.sin(angle) * this.speed * dt;
      } else {
        // In Attack Range
        if (this.attackCooldown <= 0) {
          this.attackCooldown = this.attackRate;
          // Monster Attack! Pass game to trigger player death & revive
          player.takeDamage(this.attack, floatingTexts, particles, game);
          particles.spawnClawSwipe(player.x, player.y);
        }
      }
    }
  }

  onDeath(player, dropItems, floatingTexts, particles) {
    // Reward Exp
    const expReward = Math.floor((this.isBoss ? 200 + this.tierLevel * 80 : 35 + this.tierLevel * 10));
    player.addExp(expReward);
    floatingTexts.push({
      x: this.x,
      y: this.y - 20,
      text: `+${expReward} EXP`,
      color: '#44ff44',
      scale: 1.0,
      life: 0.8
    });

    // Drop Items (Diablo-style)
    const dropRoll = Math.random();
    const dropChance = this.isBoss ? 1.0 : 0.22; // Boss 100% drops, normal mobs ~22%

    if (dropRoll < dropChance) {
      const dropCount = this.isBoss ? 2 + Math.floor(Math.random() * 2) : 1;
      for (let i = 0; i < dropCount; i++) {
        // Boss guarantees at least MAGIC or RARE
        const forceRarity = (this.isBoss && i === 0) ? (Math.random() < 0.35 ? 'RARE' : 'MAGIC') : null;
        const item = InventorySystem.generateItem(this.tierLevel, player.derived.magicFind, forceRarity);
        const offsetX = (Math.random() - 0.5) * 35;
        const offsetY = (Math.random() - 0.5) * 35;
        dropItems.push(new DropItem(this.x + offsetX, this.y + offsetY, item));
        audio.playItemDrop(item.rarity);
      }
    }

    // Death explosion particles
    particles.spawnDeathBurst(this.x, this.y, this.isBoss ? 25 : 12);
  }
}
