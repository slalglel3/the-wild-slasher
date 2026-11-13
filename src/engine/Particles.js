// Particle & VFX Engine

export class ParticleEngine {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.friction) {
        p.vx *= p.friction;
        p.vy *= p.friction;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnBloodSparks(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() < 0.6 ? '#ff2222' : '#ff9900',
        radius: 2 + Math.random() * 2,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
        friction: 0.9
      });
    }
  }

  spawnWhirlwindRing(x, y, radius = 90) {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(ang) * (radius * 0.8),
        y: y + Math.sin(ang) * (radius * 0.8),
        vx: -Math.sin(ang) * 180,
        vy: Math.cos(ang) * 180,
        color: '#66ccff',
        radius: 3 + Math.random() * 2,
        life: 0.2,
        maxLife: 0.2,
        friction: 0.95
      });
    }
  }

  spawnSlamShockwave(x, y, radius = 120) {
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const spd = 200 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: '#ffaa33',
        radius: 4 + Math.random() * 3,
        life: 0.35,
        maxLife: 0.35,
        friction: 0.88
      });
    }
  }

  spawnWarCryAura(x, y) {
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 35;
      this.particles.push({
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        vx: 0,
        vy: -70 - Math.random() * 50,
        color: '#ffd700',
        radius: 3,
        life: 0.5,
        maxLife: 0.5,
        friction: 0.98
      });
    }
  }

  spawnClawSwipe(x, y) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        color: '#ff1111',
        radius: 2,
        life: 0.18,
        maxLife: 0.18
      });
    }
  }

  spawnDeathBurst(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: '#bb44ff',
        radius: 3 + Math.random() * 3,
        life: 0.45,
        maxLife: 0.45,
        friction: 0.9
      });
    }
  }

  spawnChestOpenFX(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 30,
        color: i % 2 === 0 ? '#ffd700' : '#ffffff',
        radius: 2.5 + Math.random() * 2.5,
        life: 0.65,
        maxLife: 0.65,
        friction: 0.92
      });
    }
  }

  spawnAmbient(camera, biomeKey, width, height) {
    // Light ambient particle drift
    if (this.particles.length > 80) return;
    if (Math.random() < 0.3) {
      const sx = camera.x - width / 2 + Math.random() * width;
      const sy = camera.y - height / 2 + Math.random() * height;
      let col = '#ffffff', vx = 0, vy = 15;

      if (biomeKey === 'VOLCANIC') {
        col = '#ff4400';
        vy = -35;
        vx = (Math.random() - 0.5) * 20;
      } else if (biomeKey === 'TUNDRA') {
        col = '#e0f7fa';
        vy = 40;
        vx = -20;
      } else if (biomeKey === 'DESERT') {
        col = '#e6c280';
        vx = 60;
        vy = 10;
      } else if (biomeKey === 'TROPICAL') {
        col = '#48c774';
        vy = -15;
      }

      this.particles.push({
        x: sx, y: sy,
        vx, vy,
        color: col,
        radius: 1.5 + Math.random() * 2,
        life: 1.5,
        maxLife: 1.5
      });
    }
  }
}
