/* ============================================================
   renderer.js — all canvas drawing
   Owns cosmetic world animation (sky darkening, street patrols,
   helicopter, fire glow, flicker) driven by high-level flags the
   engine sets. Draws the room, fixtures, player and horror FX.
   Exposes: window.ZH.Renderer
   ============================================================ */
(function (ZH) {
  "use strict";

  const SPRITE_FILES = {
    player: "assets/sprites/player.png",
    house: "assets/sprites/house.png",
    tv: "assets/sprites/tv.png",
    computer: "assets/sprites/computer.png",
    window: "assets/sprites/window.png",
    door: "assets/sprites/door.png",
    helicopter: "assets/sprites/helicopter.png",
    soldier: "assets/sprites/soldier.png",
  };

  const Renderer = {
    W: 480,
    H: 270,
    canvas: null,
    ctx: null,
    sprites: {},
    ready: false,
    t: 0,

    world: {
      dark: 0,          // 0 day .. 1 deep night
      targetDark: 0,
      redSky: 0,        // catastrophe glow
      targetRed: 0,
      soldiers: [],
      heli: { active: false, x: -60, y: 26 },
      flame: 0,
      stars: [],
      flickerOn: true,
    },

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < 40; i++) {
        this.world.stars.push({
          x: Math.random() * this.W,
          y: Math.random() * 60,
          p: Math.random() * Math.PI * 2,
        });
      }
    },

    load(done) {
      const names = Object.keys(SPRITE_FILES);
      let left = names.length;
      if (left === 0) { this.ready = true; done && done(); return; }
      names.forEach((n) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          if (--left === 0) { this.ready = true; done && done(); }
        };
        img.src = SPRITE_FILES[n];
        this.sprites[n] = img;
      });
    },

    _spr(name) {
      const s = this.sprites[name];
      return s && s.complete && s.naturalWidth ? s : null;
    },

    /* ------------------------------------------------------------
       Cosmetic update driven by engine flags.
       ------------------------------------------------------------ */
    update(dt, game) {
      this.t += dt;
      const w = this.world;
      const f = game.flags;

      w.targetDark = f.night ? (f.powerOut ? 0.96 : 0.62) : (game.phase >= 2 ? 0.35 : 0.12);
      if (f.powerOut) w.targetDark = 0.9;
      w.dark += (w.targetDark - w.dark) * Math.min(1, dt * 1.5);

      w.targetRed = game.phase >= 3 ? 0.5 : (game.phase >= 2 ? 0.18 : 0);
      w.redSky += (w.targetRed - w.redSky) * Math.min(1, dt * 0.8);

      w.flame = 0.5 + 0.5 * Math.sin(this.t * 9 + Math.sin(this.t * 3));

      // Soldier patrol spawning
      if (f.soldiersOutside) {
        if (w.soldiers.length < 2 && Math.random() < dt * 0.4) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          w.soldiers.push({
            x: dir === 1 ? -20 : this.W + 20,
            dir, speed: 12 + Math.random() * 8, t: Math.random() * 10,
          });
        }
      }
      for (const s of w.soldiers) { s.x += s.dir * s.speed * dt; s.t += dt; }
      w.soldiers = w.soldiers.filter((s) => s.x > -40 && s.x < this.W + 40);

      // Helicopter fly-through
      if (f.helicopter && !w.heli.active) {
        w.heli.active = true;
        w.heli.x = -70;
        w.heli.y = 14 + Math.random() * 18;
      }
      if (w.heli.active) {
        w.heli.x += 44 * dt;
        if (w.heli.x > this.W + 70) { w.heli.active = false; game.flags.helicopter = false; }
      }

      // power flicker toggle
      if (f.powerFlicker) {
        w.flickerOn = Math.random() < 0.55;
      } else {
        w.flickerOn = true;
      }
    },

    /* ------------------------------------------------------------
       Master draw.
       ------------------------------------------------------------ */
    draw(game) {
      const ctx = this.ctx;
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // screen shake
      const sh = game.fx.shake;
      if (sh > 0.2) {
        ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      }

      this.drawRoom(game);
      this.drawObjects(game);
      this.drawPlayer(game);
      this.drawInteriorDark(game);
      this.drawFX(game);
      ctx.restore();
    },

    /* ---------- room shell ---------- */
    drawRoom(game) {
      const ctx = this.ctx;
      // back wall
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 74);
      wallGrad.addColorStop(0, "#20222c");
      wallGrad.addColorStop(1, "#171922");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, this.W, 74);

      // faded wallpaper stripes
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      for (let x = 0; x < this.W; x += 16) ctx.fillRect(x, 0, 6, 74);

      // baseboard
      ctx.fillStyle = "#2a2d38";
      ctx.fillRect(0, 70, this.W, 6);

      // floor (wood)
      const floorGrad = ctx.createLinearGradient(0, 76, 0, this.H);
      floorGrad.addColorStop(0, "#2c231b");
      floorGrad.addColorStop(1, "#1a140f");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 76, this.W, this.H - 76);
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 1;
      for (let y = 92; y < this.H; y += 22) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(this.W, y + 0.5); ctx.stroke();
      }
      for (let x = 24; x < this.W; x += 48) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 76); ctx.lineTo(x + 0.5, this.H); ctx.stroke();
      }

      // rug
      ctx.fillStyle = "#3a2438";
      ctx.fillRect(150, 150, 180, 74);
      ctx.strokeStyle = "#573454"; ctx.strokeRect(154, 154, 172, 66);

      // framed house picture on the wall (uses house.png asset)
      const hp = this._spr("house");
      if (hp) {
        ctx.fillStyle = "#0d0e12";
        ctx.fillRect(238, 8, 30, 30);
        ctx.drawImage(hp, 240, 10, 26, 26);
        ctx.strokeStyle = "#4a4030"; ctx.strokeRect(238.5, 8.5, 29, 29);
      }
    },

    /* ---------- fixtures ---------- */
    drawObjects(game) {
      for (const o of game.objects) {
        switch (o.kind) {
          case "window": this.drawWindow(o, game); break;
          case "tv": this.drawTV(o, game); break;
          case "computer": this.drawComputer(o, game); break;
          case "coffee": this.drawCoffee(o, game); break;
          case "door": this.drawDoor(o, game); break;
        }
        if (game.active === o && !game.anyScreenOpen()) this.drawHighlight(o);
      }
    },

    drawHighlight(o) {
      const ctx = this.ctx;
      ctx.strokeStyle = "rgba(126,195,107,0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(o.fx - 1.5, o.fy - 1.5, o.fw + 3, o.fh + 3);
      ctx.setLineDash([]);
    },

    drawWindow(o, game) {
      const ctx = this.ctx;
      // draw outside scene clipped to glass
      ctx.save();
      ctx.beginPath();
      ctx.rect(o.fx + 4, o.fy + 4, o.fw - 8, o.fh - 8);
      ctx.clip();
      this.drawOutside(o, game);
      ctx.restore();

      // frame sprite over it
      const spr = this._spr("window");
      if (spr) ctx.drawImage(spr, o.fx, o.fy, o.fw, o.fh);
      else {
        ctx.strokeStyle = "#5f4834"; ctx.lineWidth = 3;
        ctx.strokeRect(o.fx, o.fy, o.fw, o.fh);
        ctx.beginPath();
        ctx.moveTo(o.fx + o.fw / 2, o.fy); ctx.lineTo(o.fx + o.fw / 2, o.fy + o.fh);
        ctx.moveTo(o.fx, o.fy + o.fh / 2); ctx.lineTo(o.fx + o.fw, o.fy + o.fh / 2);
        ctx.stroke();
      }
      // barricade planks
      this.drawBarricade(o, game.barricades.window);
    },

    drawOutside(o, game) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx + 4, gy = o.fy + 4, gw = o.fw - 8, gh = o.fh - 8;

      // sky
      const day = 1 - w.dark;
      const sky = ctx.createLinearGradient(0, gy, 0, gy + gh);
      const top = this._mix([20, 26, 48], [110, 150, 200], day);
      const bot = this._mix([12, 14, 26], [180, 170, 150], day);
      // catastrophe reddening
      const rt = w.redSky;
      sky.addColorStop(0, this._rgb(this._mix(top, [60, 20, 24], rt)));
      sky.addColorStop(1, this._rgb(this._mix(bot, [120, 40, 30], rt)));
      ctx.fillStyle = sky;
      ctx.fillRect(gx, gy, gw, gh);

      // stars / moon at night
      if (w.dark > 0.4) {
        ctx.fillStyle = "rgba(230,230,255,0.9)";
        for (const s of w.stars) {
          if (s.x < gx || s.x > gx + gw || s.y < gy || s.y > gy + gh) continue;
          const tw = 0.5 + 0.5 * Math.sin(this.t * 2 + s.p);
          if (tw > 0.5) ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
        }
        ctx.fillStyle = "rgba(220,225,210," + (0.7 * w.dark) + ")";
        ctx.beginPath();
        ctx.arc(gx + gw * 0.75, gy + gh * 0.28, 5, 0, Math.PI * 2); ctx.fill();
      }

      // distant building silhouettes
      const base = gy + gh * 0.62;
      ctx.fillStyle = this._rgb(this._mix([10, 12, 18], [40, 44, 54], day * 0.5));
      const seed = o.fx;
      for (let i = 0; i < 5; i++) {
        const bx = gx + ((i * 37 + seed) % (gw + 20)) - 10;
        const bw = 10 + ((i * 13 + seed) % 12);
        const bh = 14 + ((i * 17 + seed) % 20);
        ctx.fillRect(bx, base - bh, bw, bh);
        // lit windows flicker out as power fails / night deepens
        if (Math.random() < 0.02 * day + 0.005) {
          ctx.fillStyle = "rgba(230,200,120,0.5)";
          ctx.fillRect(bx + 2, base - bh + 3, 2, 2);
          ctx.fillStyle = this._rgb(this._mix([10, 12, 18], [40, 44, 54], day * 0.5));
        }
      }

      // fire glow on horizon during catastrophe
      if (w.redSky > 0.05) {
        const fg = ctx.createLinearGradient(0, base - 6, 0, base + 8);
        fg.addColorStop(0, "rgba(255,120,40," + (0.55 * w.redSky * w.flame) + ")");
        fg.addColorStop(1, "rgba(120,20,10,0)");
        ctx.fillStyle = fg;
        ctx.fillRect(gx, base - 6, gw, 14);
      }

      // street
      ctx.fillStyle = "#161418";
      ctx.fillRect(gx, base, gw, gy + gh - base);
      ctx.strokeStyle = "rgba(200,200,120,0.15)";
      ctx.beginPath(); ctx.moveTo(gx, base + (gy + gh - base) / 2); ctx.lineTo(gx + gw, base + (gy + gh - base) / 2); ctx.stroke();

      // soldiers on the street
      const sspr = this._spr("soldier");
      for (const s of w.soldiers) {
        if (s.x < o.fx - 20 || s.x > o.fx + o.fw + 20) continue;
        const sx = s.x, sy = base + 2;
        const bob = Math.sin(s.t * 6) * 0.6;
        if (sspr) {
          ctx.save();
          if (s.dir < 0) { ctx.translate(sx + 6, 0); ctx.scale(-1, 1); ctx.translate(-(sx + 6), 0); }
          ctx.drawImage(sspr, sx - 5, sy - 15 + bob, 10, 14);
          ctx.restore();
        } else {
          ctx.fillStyle = "#4a543c";
          ctx.fillRect(sx - 3, sy - 12 + bob, 6, 12);
        }
        // flashlight cone at night
        if (w.dark > 0.4) {
          const g = ctx.createRadialGradient(sx, sy - 6, 1, sx, sy - 6, 22);
          g.addColorStop(0, "rgba(255,245,200,0.28)");
          g.addColorStop(1, "rgba(255,245,200,0)");
          ctx.fillStyle = g;
          ctx.fillRect(gx, gy, gw, gh);
        }
      }

      // helicopter sweeping across the sky
      if (w.heli.active) {
        const hx = w.heli.x, hy = gy + w.heli.y * 0.4;
        if (hx + 30 > o.fx && hx - 30 < o.fx + o.fw) {
          const hspr = this._spr("helicopter");
          if (hspr) ctx.drawImage(hspr, hx - 16, hy, 32, 15);
          else { ctx.fillStyle = "#2a2e2a"; ctx.fillRect(hx - 12, hy + 4, 24, 5); }
          // searchlight
          const g = ctx.createLinearGradient(hx, hy + 10, hx - 6, base);
          g.addColorStop(0, "rgba(255,250,210,0.30)");
          g.addColorStop(1, "rgba(255,250,210,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(hx - 2, hy + 10); ctx.lineTo(hx + 2, hy + 10);
          ctx.lineTo(hx + 14, base); ctx.lineTo(hx - 18, base);
          ctx.closePath(); ctx.fill();
        }
      }
    },

    drawTV(o, game) {
      const ctx = this.ctx;
      // stand
      ctx.fillStyle = "#20232c";
      ctx.fillRect(o.fx + 6, o.fy + o.fh - 8, o.fw - 12, 10);
      const spr = this._spr("tv");
      if (spr && this.world.flickerOn) ctx.drawImage(spr, o.fx, o.fy, o.fw, o.fh);
      else {
        ctx.fillStyle = "#14161c"; ctx.fillRect(o.fx, o.fy, o.fw, o.fh - 6);
      }
      // screen glow — content depends on phase
      if (game.tvOn && this.world.flickerOn) {
        const glow = game.phase >= 2 ? "rgba(210,70,60,0.30)" : "rgba(120,200,140,0.28)";
        ctx.fillStyle = glow;
        ctx.fillRect(o.fx + 5, o.fy + 5, o.fw - 10, o.fh - 18);
        // scanline shimmer
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        const ly = o.fy + 6 + ((this.t * 30) % (o.fh - 20));
        ctx.fillRect(o.fx + 5, ly, o.fw - 10, 2);
      }
    },

    drawComputer(o, game) {
      const ctx = this.ctx;
      const spr = this._spr("computer");
      if (spr && this.world.flickerOn) ctx.drawImage(spr, o.fx, o.fy, o.fw, o.fh);
      else { ctx.fillStyle = "#1a1d24"; ctx.fillRect(o.fx, o.fy, o.fw, o.fh); }
      if (game.computerAlerts.length && this.world.flickerOn) {
        const crit = game.phase >= 3;
        ctx.fillStyle = crit ? "rgba(210,70,60,0.22)" : "rgba(80,220,130,0.20)";
        ctx.fillRect(o.fx + 8, o.fy + 8, o.fw - 16, o.fh - 24);
      }
    },

    drawCoffee(o, game) {
      const ctx = this.ctx;
      // counter
      ctx.fillStyle = "#3b3f4a";
      ctx.fillRect(o.fx - 2, o.fy + o.fh - 12, o.fw + 4, 14);
      // machine body
      ctx.fillStyle = "#23262e";
      ctx.fillRect(o.fx + 14, o.fy + 12, o.fw - 28, o.fh - 22);
      ctx.fillStyle = "#15171c";
      ctx.fillRect(o.fx + 18, o.fy + 22, o.fw - 36, 10); // pot
      // amber ready light
      const on = Math.sin(this.t * 3) > -0.5;
      ctx.fillStyle = on ? "#e0a83c" : "#5a4416";
      ctx.fillRect(o.fx + 20, o.fy + 16, 3, 3);
      // steam
      if (this.world.flickerOn) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let i = 0; i < 3; i++) {
          const sx = o.fx + 24 + i * 6 + Math.sin(this.t * 2 + i) * 2;
          ctx.fillRect(sx, o.fy + 6 - (this.t * 6 + i * 3) % 8, 1, 2);
        }
      }
      // label
      ctx.fillStyle = "#8a6a3a";
      ctx.fillRect(o.fx + 24, o.fy + 34, o.fw - 48, 2);
    },

    drawDoor(o, game) {
      const ctx = this.ctx;
      const spr = this._spr("door");
      if (spr) ctx.drawImage(spr, o.fx, o.fy, o.fw, o.fh);
      else { ctx.fillStyle = "#68492f"; ctx.fillRect(o.fx, o.fy, o.fw, o.fh); }
      // barricade planks over the door
      this.drawBarricade(o, game.barricades.door);
      // knock indicator
      if (game.doorKnocking) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 6));
        ctx.fillStyle = "rgba(210,70,60," + a + ")";
        ctx.font = "8px monospace";
        ctx.fillText("!", o.fx + o.fw / 2 - 1, o.fy - 2);
      }
    },

    drawBarricade(o, level) {
      if (!level) return;
      const ctx = this.ctx;
      ctx.save();
      const planks = level; // 1..3
      for (let i = 0; i < planks; i++) {
        const py = o.fy + 8 + i * ((o.fh - 16) / 3);
        ctx.fillStyle = "#7a5a38";
        ctx.save();
        ctx.translate(o.fx + o.fw / 2, py + 5);
        ctx.rotate((i % 2 ? 1 : -1) * 0.08);
        ctx.fillRect(-o.fw / 2 - 2, -3, o.fw + 4, 7);
        ctx.strokeStyle = "#4d391f"; ctx.strokeRect(-o.fw / 2 - 2, -3, o.fw + 4, 7);
        // nails
        ctx.fillStyle = "#c9c2b0";
        ctx.fillRect(-o.fw / 2, -1, 2, 2);
        ctx.fillRect(o.fw / 2 - 2, -1, 2, 2);
        ctx.restore();
      }
      ctx.restore();
    },

    /* ---------- player ---------- */
    drawPlayer(game) {
      const ctx = this.ctx;
      const p = game.player;
      const spr = this._spr("player");
      const bob = p.moving ? Math.abs(Math.sin(p.animTime * 8)) * 1.5 : 0;
      // tremble at high stress
      const trem = p.stress > 70 ? (Math.random() - 0.5) * (p.stress - 70) / 30 : 0;
      const px = Math.round(p.x - p.w / 2 + trem);
      const py = Math.round(p.y - p.h / 2 - bob);

      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.h / 2 - 1, p.w * 0.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (spr) {
        ctx.save();
        if (p.dir < 0) {
          ctx.translate(px + p.w, py); ctx.scale(-1, 1);
          ctx.drawImage(spr, 0, 0, p.w, p.h);
        } else {
          ctx.drawImage(spr, px, py, p.w, p.h);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "#8a2828";
        ctx.fillRect(px, py, p.w, p.h);
      }
    },

    /* ---------- interior darkness / lighting ---------- */
    drawInteriorDark(game) {
      const ctx = this.ctx;
      const w = this.world;
      const dark = w.flickerOn ? w.dark : Math.min(1, w.dark + 0.5);
      if (dark <= 0.02) return;

      // Build a lighting layer: dark overlay minus light pools.
      ctx.save();
      ctx.fillStyle = "rgba(4,5,10," + dark + ")";
      ctx.fillRect(0, 0, this.W, this.H);

      // Cut light around the player (a lamp / phone glow) and lit screens.
      ctx.globalCompositeOperation = "destination-out";
      const p = game.player;
      this._lightPool(p.x, p.y, 70, 0.85 * (w.flickerOn ? 1 : 0.4));

      if (game.tvOn && w.flickerOn) {
        const tv = game.byId("tv");
        if (tv) this._lightPool(tv.fx + tv.fw / 2, tv.fy + tv.fh / 2, 46, 0.6);
      }
      if (game.computerAlerts.length && w.flickerOn) {
        const c = game.byId("computer");
        if (c) this._lightPool(c.fx + c.fw / 2, c.fy + c.fh / 2, 40, 0.5);
      }
      ctx.restore();
    },

    _lightPool(x, y, r, strength) {
      const ctx = this.ctx;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, "rgba(0,0,0," + strength + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    },

    /* ---------- horror FX overlays ---------- */
    drawFX(game) {
      const ctx = this.ctx;
      const p = game.player;
      const stress = p.stress;

      // vignette
      const vg = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.W, this.H);

      // stress red pulse
      if (stress > 45) {
        const s = (stress - 45) / 55;
        const pulse = 0.5 + 0.5 * Math.sin(this.t * (2 + s * 4));
        ctx.fillStyle = "rgba(120,10,14," + (s * 0.28 * pulse) + ")";
        ctx.fillRect(0, 0, this.W, this.H);
      }

      // hallucinated silhouette at very high stress
      if (stress > 82 && Math.sin(this.t * 0.7) > 0.985) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        const hx = 40 + Math.random() * (this.W - 80);
        ctx.fillRect(hx, 120, 12, 60);
        ctx.beginPath(); ctx.arc(hx + 6, 116, 7, 0, Math.PI * 2); ctx.fill();
      }

      // brief white flash FX (gunshots / power)
      if (game.fx.flash > 0.01) {
        ctx.fillStyle = "rgba(255,255,255," + game.fx.flash + ")";
        ctx.fillRect(0, 0, this.W, this.H);
      }
      // red flash (danger)
      if (game.fx.redFlash > 0.01) {
        ctx.fillStyle = "rgba(180,20,20," + game.fx.redFlash + ")";
        ctx.fillRect(0, 0, this.W, this.H);
      }

      // static overlay when power failing / very stressed
      if (game.flags.powerFlicker || stress > 90) {
        ctx.globalAlpha = 0.05 + (stress > 90 ? 0.05 : 0);
        for (let i = 0; i < 60; i++) {
          ctx.fillStyle = Math.random() < 0.5 ? "#fff" : "#000";
          ctx.fillRect(Math.random() * this.W, Math.random() * this.H, 2, 1);
        }
        ctx.globalAlpha = 1;
      }
    },

    /* ------------------------------------------------------------
       Peephole render (used by the door modal).
       ------------------------------------------------------------ */
    drawPeephole(pctx, visitor, game) {
      const W = 180, H = 180;
      pctx.imageSmoothingEnabled = false;
      // night porch
      pctx.fillStyle = "#0a0b10";
      pctx.fillRect(0, 0, W, H);
      const g = pctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 95);
      g.addColorStop(0, "#2a2620");
      g.addColorStop(1, "#050507");
      pctx.fillStyle = g;
      pctx.fillRect(0, 0, W, H);

      // porch floor
      pctx.fillStyle = "#191410";
      pctx.fillRect(0, 120, W, 60);

      const cx = W / 2;
      const drawSprite = (name, w, h, yOff) => {
        const img = Renderer._spr(name);
        if (img) pctx.drawImage(img, cx - w / 2, 120 - h + yOff, w, h);
      };

      switch (visitor.sprite) {
        case "soldier":
          drawSprite("soldier", 60, 78, 6);
          break;
        case "infected": {
          // hunched, twitching figure
          const tw = Math.sin(Renderer.t * 12) * 3;
          pctx.save();
          pctx.translate(tw, 0);
          pctx.fillStyle = "#5a6b4e";
          pctx.fillRect(cx - 16, 60, 32, 62); // torso
          pctx.fillStyle = "#7a8a6a";
          pctx.beginPath(); pctx.arc(cx, 52, 15, 0, Math.PI * 2); pctx.fill(); // head
          pctx.fillStyle = "#2a0a0a";
          pctx.fillRect(cx - 8, 78, 20, 26); // dark bloody stain
          pctx.fillStyle = "#c02020";
          pctx.fillRect(cx - 6, 48, 3, 3); pctx.fillRect(cx + 3, 48, 3, 3); // eyes
          pctx.fillStyle = "#1a0505";
          pctx.fillRect(cx - 5, 58, 10, 3); // mouth
          pctx.restore();
          break;
        }
        default: {
          // ordinary person (survivor / neighbor / looter / child)
          const skin = visitor.sprite === "child" ? "#e6c0a0" : "#d8b088";
          const clothes = visitor.color || "#3a5a7a";
          const scale = visitor.sprite === "child" ? 0.7 : 1;
          const bodyH = 66 * scale;
          pctx.fillStyle = clothes;
          pctx.fillRect(cx - 14 * scale, 122 - bodyH, 28 * scale, bodyH);
          pctx.fillStyle = skin;
          pctx.beginPath(); pctx.arc(cx, 122 - bodyH - 8 * scale, 13 * scale, 0, Math.PI * 2); pctx.fill();
          pctx.fillStyle = "#2a1c14";
          pctx.fillRect(cx - 13 * scale, 122 - bodyH - 18 * scale, 26 * scale, 8 * scale); // hair
          pctx.fillStyle = "#1a1a1a";
          pctx.fillRect(cx - 5 * scale, 122 - bodyH - 9 * scale, 3, 2);
          pctx.fillRect(cx + 3 * scale, 122 - bodyH - 9 * scale, 3, 2);
          break;
        }
      }

      // fish-eye vignette of the peephole lens
      const lens = pctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 92);
      lens.addColorStop(0, "rgba(0,0,0,0)");
      lens.addColorStop(0.8, "rgba(0,0,0,0.35)");
      lens.addColorStop(1, "rgba(0,0,0,0.95)");
      pctx.fillStyle = lens;
      pctx.fillRect(0, 0, W, H);

      // faint scanlines
      pctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let y = 0; y < H; y += 3) pctx.fillRect(0, y, W, 1);
    },

    /* ---------- color helpers ---------- */
    _mix(a, b, t) {
      t = Math.max(0, Math.min(1, t));
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ];
    },
    _rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; },
  };

  ZH.Renderer = Renderer;
})(window.ZH = window.ZH || {});
