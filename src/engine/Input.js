// Hybrid Input Controller: Mobile Virtual Joystick + Touch Buttons & PC Keyboard/Mouse

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Movement vector (-1.0 to 1.0)
    this.moveX = 0;
    this.moveY = 0;

    // Trigger flags (one-shot per action)
    this.triggerSlash = false;
    this.triggerWhirlwind = false;
    this.triggerDash = false;
    this.triggerSlam = false;
    this.triggerWarCry = false;

    // UI toggle triggers
    this.toggleStats = false;
    this.toggleInventory = false;
    this.toggleRebirth = false;
    this.toggleBot = false;

    // Virtual Joystick State
    this.joystick = {
      active: false,
      identifier: null,
      startX: 0,
      startY: 0,
      currX: 0,
      currY: 0,
      radius: 55
    };

    // Keyboard state
    this.keys = {};

    this.bindEvents();
  }

  bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') this.triggerSlash = true;
      if (e.code === 'Digit1') this.triggerWhirlwind = true;
      if (e.code === 'Digit2' || e.code === 'ShiftLeft') this.triggerDash = true;
      if (e.code === 'Digit3' || e.code === 'KeyE') this.triggerSlam = true;
      if (e.code === 'Digit4' || e.code === 'KeyQ') this.triggerWarCry = true;

      if (e.code === 'KeyC') this.toggleStats = true;
      if (e.code === 'KeyI') this.toggleInventory = true;
      if (e.code === 'KeyR') this.toggleRebirth = true;
      if (e.code === 'KeyB') this.toggleBot = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Touch events on canvas
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

    // Mouse fallback for clicking on canvas
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.triggerSlash = true;
      }
    });
  }

  handleTouchStart(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const tx = (touch.clientX - rect.left) * scaleX;
      const ty = (touch.clientY - rect.top) * scaleY;

      // Left half of screen: Virtual Joystick
      if (tx < this.canvas.width * 0.45 && !this.joystick.active) {
        this.joystick.active = true;
        this.joystick.identifier = touch.identifier;
        this.joystick.startX = tx;
        this.joystick.startY = ty;
        this.joystick.currX = tx;
        this.joystick.currY = ty;
      } else {
        // Right side skill buttons check
        this.checkSkillTouch(tx, ty);
      }
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (this.joystick.active && touch.identifier === this.joystick.identifier) {
        const tx = (touch.clientX - rect.left) * scaleX;
        const ty = (touch.clientY - rect.top) * scaleY;
        const dx = tx - this.joystick.startX;
        const dy = ty - this.joystick.startY;
        const dist = Math.hypot(dx, dy);

        if (dist > this.joystick.radius) {
          this.joystick.currX = this.joystick.startX + (dx / dist) * this.joystick.radius;
          this.joystick.currY = this.joystick.startY + (dy / dist) * this.joystick.radius;
        } else {
          this.joystick.currX = tx;
          this.joystick.currY = ty;
        }
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (this.joystick.active && touch.identifier === this.joystick.identifier) {
        this.joystick.active = false;
        this.joystick.identifier = null;
        this.joystick.currX = this.joystick.startX;
        this.joystick.currY = this.joystick.startY;
      }
    }
  }

  checkSkillTouch(tx, ty) {
    // Touch zones for on-screen buttons (defined in canvas coordinates)
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Main Slash Button (Bottom Right)
    const slashBtn = { x: W - 90, y: H - 90, r: 45 };
    if (Math.hypot(tx - slashBtn.x, ty - slashBtn.y) <= slashBtn.r) {
      this.triggerSlash = true;
      return;
    }

    // Skill 1 (Whirlwind)
    const wwBtn = { x: W - 175, y: H - 80, r: 30 };
    if (Math.hypot(tx - wwBtn.x, ty - wwBtn.y) <= wwBtn.r) {
      this.triggerWhirlwind = true;
      return;
    }

    // Skill 2 (Dash)
    const dashBtn = { x: W - 80, y: H - 180, r: 30 };
    if (Math.hypot(tx - dashBtn.x, ty - dashBtn.y) <= dashBtn.r) {
      this.triggerDash = true;
      return;
    }

    // Skill 3 (Ground Slam)
    const slamBtn = { x: W - 150, y: H - 150, r: 30 };
    if (Math.hypot(tx - slamBtn.x, ty - slamBtn.y) <= slamBtn.r) {
      this.triggerSlam = true;
      return;
    }

    // Skill 4 (War Cry)
    const warCryBtn = { x: W - 225, y: H - 130, r: 28 };
    if (Math.hypot(tx - warCryBtn.x, ty - warCryBtn.y) <= warCryBtn.r) {
      this.triggerWarCry = true;
      return;
    }
  }

  update() {
    // Determine movement direction
    let mx = 0;
    let my = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;

    // If keyboard is pressed, use keyboard
    if (mx !== 0 || my !== 0) {
      this.moveX = mx;
      this.moveY = my;
    } else if (this.joystick.active) {
      // Joystick vector
      const dx = this.joystick.currX - this.joystick.startX;
      const dy = this.joystick.currY - this.joystick.startY;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        this.moveX = dx / this.joystick.radius;
        this.moveY = dy / this.joystick.radius;
      } else {
        this.moveX = 0;
        this.moveY = 0;
      }
    } else {
      this.moveX = 0;
      this.moveY = 0;
    }
  }

  // Clear one-shot action triggers after game frame consumption
  consumeTriggers() {
    this.triggerSlash = false;
    this.triggerWhirlwind = false;
    this.triggerDash = false;
    this.triggerSlam = false;
    this.triggerWarCry = false;
    this.toggleStats = false;
    this.toggleInventory = false;
    this.toggleRebirth = false;
    this.toggleBot = false;
  }
}
