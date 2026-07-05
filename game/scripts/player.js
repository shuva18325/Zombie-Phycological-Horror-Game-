/* ============================================================
   player.js — the homeowner
   Movement, animation, and personal condition (stress / fatigue).
   Exposes: window.ZH.Player
   ============================================================ */
(function (ZH) {
  "use strict";

  function Player() {
    this.w = 14;
    this.h = 22;
    this.speed = 78;          // px / second
    this.reset();
  }

  Player.prototype.reset = function () {
    this.x = 240;
    this.y = 200;
    this.vx = 0;
    this.vy = 0;
    this.dir = 1;             // 1 right, -1 left
    this.moving = false;
    this.animTime = 0;
    this.frame = 0;

    this.stress = 12;         // 0..100
    this.fatigue = 20;        // 0..100
    this.coffeeCooldown = 0;
    this.trembleSeed = Math.random() * 1000;
  };

  // Feet point used for interaction proximity.
  Player.prototype.feet = function () {
    return { x: this.x, y: this.y + this.h * 0.4 };
  };

  Player.prototype.addStress = function (amount) {
    this.stress = Math.max(0, Math.min(100, this.stress + amount));
  };

  Player.prototype.addFatigue = function (amount) {
    this.fatigue = Math.max(0, Math.min(100, this.fatigue + amount));
  };

  Player.prototype.update = function (dt, input, bounds) {
    let ax = 0, ay = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.up) ay -= 1;
    if (input.down) ay += 1;

    const len = Math.hypot(ax, ay) || 1;
    ax /= len; ay /= len;

    // Fatigue drags the player down; high stress makes movement jittery.
    const fatigueFactor = 1 - (this.fatigue / 100) * 0.45;
    const spd = this.speed * fatigueFactor;

    this.vx = ax * spd;
    this.vy = ay * spd;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.moving = ax !== 0 || ay !== 0;
    if (ax !== 0) this.dir = ax > 0 ? 1 : -1;

    // clamp to walkable floor
    if (bounds) {
      this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x));
      this.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.y));
    }

    // animation
    if (this.moving) {
      this.animTime += dt;
      this.frame = Math.floor(this.animTime * 8) % 4;
    } else {
      this.animTime = 0;
      this.frame = 0;
    }

    // Slow, constant fatigue creep — staying awake all night is hard.
    this.addFatigue(dt * 0.55);
    if (this.coffeeCooldown > 0) this.coffeeCooldown -= dt;

    // Fatigue quietly feeds dread; exhaustion breeds paranoia.
    if (this.fatigue > 85) this.addStress(dt * 0.6);
  };

  ZH.Player = Player;
})(window.ZH = window.ZH || {});
