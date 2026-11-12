// Dropped Item on Ground (Diablo-style loot beam)

import { Entity } from './Entity.js';
import { audio } from '../engine/Audio.js';

export class DropItem extends Entity {
  constructor(x, y, itemData) {
    super(x, y, 12);
    this.item = itemData;
    this.life = 0; // For bounce animation
    this.isPickedUp = false;
  }

  update(dt, player, inventory, floatingTexts) {
    if (this.isPickedUp) return;
    this.life += dt;

    const dist = this.distanceTo(player);
    // Magnet attraction range
    if (dist < 65) {
      const angle = this.angleTo(player);
      const pullSpeed = 300 * dt;
      this.x += Math.cos(angle) * pullSpeed;
      this.y += Math.sin(angle) * pullSpeed;

      // Pickup distance
      if (dist < 18) {
        if (inventory.addItem(this.item)) {
          this.isPickedUp = true;
          this.alive = false;
          audio.playClick();
          floatingTexts.push({
            x: this.x,
            y: this.y - 20,
            text: `[${this.item.name}] 획득!`,
            color: this.item.color,
            scale: 1.0,
            life: 1.0
          });
        }
      }
    }
  }
}
