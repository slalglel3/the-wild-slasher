// Base Entity Class

export class Entity {
  constructor(x, y, radius = 16) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.alive = true;
    this.facing = 1; // 1: right, -1: left
  }

  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  angleTo(other) {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }
}
