/* ============================================================
   renderer.js — all canvas drawing
   The room is a studio apartment recreated from the reference
   photo: big black-framed windows with a dusk city view, the bed
   beneath them, a large TV on a white console with a mountain
   print beside it, a white ladder shelf, a desk with monitor and
   office chair, a wooden dresser-kitchenette (coffee maker +
   hotplate + food basket), a sputnik floor lamp, a sectional
   couch, and a wooden coffee table on a trellis rug over light
   hardwood. The entry door sits on the right wall.
   Also owns the animated outside world (day/night sky, street
   decay, soldiers, shamblers, helicopter) and all horror FX.
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

  // The two window panes of the studio (glass areas).
  const PANES = [
    { fx: 198, fy: 10, fw: 88, fh: 84 },
    { fx: 296, fy: 10, fw: 88, fh: 84 },
  ];

  const Renderer = {
    W: 480,
    H: 270,
    canvas: null,
    ctx: null,
    sprites: {},
    ready: false,
    t: 0,

    world: {
      dark: 0,
      targetDark: 0,
      redSky: 0,
      targetRed: 0,
      soldiers: [],
      shamblers: [],
      heli: { active: false, x: -60, y: 26 },
      flame: 0,
      stars: [],
      flickerOn: true,
    },

    resetWorld() {
      this.world.soldiers = [];
      this.world.shamblers = [];
      this.world.heli.active = false;
      this.world.redSky = 0;
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
       Cosmetic update driven by engine state.
       ------------------------------------------------------------ */
    update(dt, game) {
      this.t += dt;
      const w = this.world;
      const f = game.flags;

      // day/night from the in-game clock (each day starts at 08:00)
      const h = (typeof game.hour === "number") ? game.hour : 21;
      let daylight;
      if (h >= 7 && h < 17) daylight = 1;
      else if (h >= 17 && h < 21) daylight = 1 - (h - 17) / 4;
      else if (h >= 5 && h < 7) daylight = (h - 5) / 2;
      else daylight = 0;
      w.targetDark = 0.1 + (1 - daylight) * 0.57 + (game.phase >= 2 ? 0.04 : 0);
      if (f.powerOut) w.targetDark = Math.max(w.targetDark, 0.9);
      w.dark += (w.targetDark - w.dark) * Math.min(1, dt * 1.5);

      w.targetRed = game.phase >= 3 ? 0.5 : (game.phase >= 2 ? 0.18 : 0);
      w.redSky += (w.targetRed - w.redSky) * Math.min(1, dt * 0.8);

      w.flame = 0.5 + 0.5 * Math.sin(this.t * 9 + Math.sin(this.t * 3));

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

      const det = game.det || 0;
      if (det >= 3 && w.shamblers.length < 3 && Math.random() < dt * 0.15) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        w.shamblers.push({
          x: dir === 1 ? -15 : this.W + 15,
          dir, speed: 3.5 + Math.random() * 4, t: Math.random() * 10,
        });
      }
      for (const z of w.shamblers) { z.x += z.dir * z.speed * dt; z.t += dt; }
      w.shamblers = w.shamblers.filter((z) => z.x > -30 && z.x < this.W + 30);

      if (f.helicopter && !w.heli.active) {
        w.heli.active = true;
        w.heli.x = -70;
        w.heli.y = 12 + Math.random() * 16;
      }
      if (w.heli.active) {
        w.heli.x += 44 * dt;
        if (w.heli.x > this.W + 70) { w.heli.active = false; game.flags.helicopter = false; }
      }

      w.flickerOn = f.powerFlicker ? Math.random() < 0.55 : true;
    },

    /* ------------------------------------------------------------
       Master draw.
       ------------------------------------------------------------ */
    draw(game) {
      const ctx = this.ctx;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const sh = game.fx.shake;
      if (sh > 0.2) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

      this.drawRoom(game);
      this.drawObjects(game);
      this.drawPlayer(game);
      this.drawInteriorDark(game);
      this.drawFX(game);
      ctx.restore();
    },

    /* ============================================================
       THE STUDIO APARTMENT (from the reference photo)
       ============================================================ */
    drawRoom(game) {
      const ctx = this.ctx;

      /* ---- back wall (warm greige) ---- */
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 112);
      wallGrad.addColorStop(0, "#a29a8d");
      wallGrad.addColorStop(1, "#8d8578");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, this.W, 112);
      // white baseboard
      ctx.fillStyle = "#d9d5cb";
      ctx.fillRect(0, 106, this.W, 6);

      /* ---- hardwood floor ---- */
      const floorGrad = ctx.createLinearGradient(0, 112, 0, this.H);
      floorGrad.addColorStop(0, "#c09a63");
      floorGrad.addColorStop(1, "#9d7c47");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 112, this.W, this.H - 112);
      ctx.strokeStyle = "rgba(90,62,30,0.30)";
      ctx.lineWidth = 1;
      for (let y = 126; y < this.H; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(this.W, y + 0.5); ctx.stroke();
      }
      for (let x = 30; x < this.W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 112); ctx.lineTo(x + 0.5, this.H); ctx.stroke();
      }

      /* ---- windows: black frames + dusk city outside ---- */
      // outer frames
      ctx.fillStyle = "#17171b";
      ctx.fillRect(194, 4, 96, 96);
      ctx.fillRect(292, 4, 96, 96);
      // outside view in each pane
      for (const p of PANES) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.fx, p.fy, p.fw, p.fh);
        ctx.clip();
        this.drawOutside(p, game);
        ctx.restore();
        // mullions
        ctx.fillStyle = "#17171b";
        ctx.fillRect(p.fx + p.fw / 2 - 1, p.fy, 2, p.fh);
        ctx.fillRect(p.fx, p.fy + p.fh / 2 - 1, p.fw, 2);
      }
      // white sill + plants (from the photo)
      ctx.fillStyle = "#ddd8ce";
      ctx.fillRect(192, 98, 198, 7);
      // terracotta pots with green plants
      for (const px of [300, 338]) {
        ctx.fillStyle = "#a35a34";
        ctx.fillRect(px, 90, 12, 8);
        ctx.fillStyle = "#4a7a3a";
        ctx.fillRect(px + 1, 82, 3, 8);
        ctx.fillRect(px + 5, 78, 3, 12);
        ctx.fillRect(px + 9, 84, 3, 6);
        ctx.fillStyle = "#5e9448";
        ctx.fillRect(px + 3, 80, 2, 4);
        ctx.fillRect(px + 7, 76, 2, 4);
      }

      /* ---- mountain art print (left wall, above the TV) ---- */
      ctx.fillStyle = "#e8e4dc";           // white frame
      ctx.fillRect(112, 4, 34, 28);
      ctx.fillStyle = "#b9c7cf";           // sky
      ctx.fillRect(115, 7, 28, 22);
      ctx.fillStyle = "#5d7286";           // far peaks
      ctx.beginPath();
      ctx.moveTo(115, 29); ctx.lineTo(124, 15); ctx.lineTo(131, 29);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#3c4e60";           // near peak
      ctx.beginPath();
      ctx.moveTo(125, 29); ctx.lineTo(135, 11); ctx.lineTo(143, 29);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e8e4dc";           // snowcap
      ctx.fillRect(134, 13, 3, 2);

      /* ---- big TV on white console (left, like the photo) ---- */
      // console
      ctx.fillStyle = "#e0dbd0";
      ctx.fillRect(8, 92, 96, 18);
      ctx.fillStyle = "#c7c2b6";
      ctx.fillRect(8, 100, 96, 2);          // shelf line
      ctx.fillRect(12, 110, 4, 4); ctx.fillRect(96, 110, 4, 4); // legs
      // tv body
      ctx.fillStyle = "#0d0f13";
      ctx.fillRect(14, 30, 82, 62);
      // screen inset drawn dynamically in drawObjects

      /* ---- white ladder shelf ---- */
      ctx.fillStyle = "#e3dfd5";
      ctx.fillRect(108, 36, 3, 76);
      ctx.fillRect(130, 36, 3, 76);
      for (const sy of [48, 68, 88, 106]) {
        ctx.fillRect(108, sy, 25, 3);
      }
      // little things on the shelves
      ctx.fillStyle = "#7a4a3a"; ctx.fillRect(112, 42, 4, 6);   // book
      ctx.fillStyle = "#3a5a7a"; ctx.fillRect(117, 40, 4, 8);   // book
      ctx.fillStyle = "#4a7a3a"; ctx.fillRect(124, 60, 5, 8);   // plant
      ctx.fillStyle = "#a35a34"; ctx.fillRect(124, 66, 5, 2);   // pot
      ctx.fillStyle = "#c9a13b"; ctx.fillRect(113, 82, 6, 6);   // box

      /* ---- the bed (under the left window, like the photo) ---- */
      // headboard cushion
      ctx.fillStyle = "#8f8f94";
      ctx.fillRect(138, 56, 94, 18);
      // pillows
      ctx.fillStyle = "#f4f2ec";
      ctx.fillRect(144, 62, 36, 14);
      ctx.fillRect(186, 62, 36, 14);
      ctx.strokeStyle = "#d8d4c9";
      ctx.strokeRect(144.5, 62.5, 35, 13);
      ctx.strokeRect(186.5, 62.5, 35, 13);
      // duvet
      ctx.fillStyle = "#eceae2";
      ctx.fillRect(136, 74, 96, 54);
      ctx.fillStyle = "#dcd9cf";
      ctx.fillRect(136, 96, 96, 3);          // fold line
      // grey platform base
      ctx.fillStyle = "#75757a";
      ctx.fillRect(136, 128, 96, 12);
      ctx.fillStyle = "#5c5c61";
      ctx.fillRect(138, 140, 8, 4); ctx.fillRect(226, 140, 8, 4);
      // soft shadow
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(136, 144, 96, 3);

      /* ---- desk + monitor + office chair (right, under window) ---- */
      ctx.fillStyle = "#8a6a48";
      ctx.fillRect(316, 84, 84, 6);          // desktop
      ctx.fillStyle = "#6e5236";
      ctx.fillRect(318, 90, 4, 22); ctx.fillRect(394, 90, 4, 22); // legs
      // monitor (screen glow drawn in drawObjects)
      ctx.fillStyle = "#101216";
      ctx.fillRect(338, 56, 40, 28);
      ctx.fillRect(354, 84, 8, 3);           // stand
      // keyboard
      ctx.fillStyle = "#23262c";
      ctx.fillRect(340, 86, 24, 3);
      // office chair (black, in front of desk)
      ctx.fillStyle = "#1c1e24";
      ctx.fillRect(344, 94, 26, 22);         // backrest
      ctx.fillStyle = "#26282f";
      ctx.fillRect(340, 116, 34, 10);        // seat
      ctx.fillStyle = "#15161a";
      ctx.fillRect(354, 126, 5, 10);         // post
      ctx.fillRect(344, 136, 26, 3);         // star base

      /* ---- dresser-kitchenette (wood, right of desk) ---- */
      ctx.fillStyle = "#97713f";
      ctx.fillRect(404, 64, 50, 48);
      ctx.strokeStyle = "#6e4f28";
      ctx.strokeRect(408.5, 70.5, 41, 12);
      ctx.strokeRect(408.5, 86.5, 41, 12);
      ctx.fillStyle = "#e0c47a";
      ctx.fillRect(427, 74, 4, 3); ctx.fillRect(427, 90, 4, 3);  // knobs
      // coffee maker on top
      ctx.fillStyle = "#1d1f24";
      ctx.fillRect(408, 46, 16, 18);
      ctx.fillStyle = "#101116";
      ctx.fillRect(410, 54, 12, 8);          // carafe slot
      ctx.fillStyle = "#5a4416";
      ctx.fillRect(410, 48, 3, 3);           // (light drawn dynamic)
      // hotplate
      ctx.fillStyle = "#2a2c31";
      ctx.fillRect(428, 56, 14, 8);
      ctx.fillStyle = "#3a3d44";
      ctx.beginPath(); ctx.arc(435, 60, 4, 0, Math.PI * 2); ctx.fill();
      // food basket (eggs & things)
      ctx.fillStyle = "#8a6234";
      ctx.fillRect(444, 56, 10, 8);
      ctx.fillStyle = "#efe9da";
      ctx.fillRect(446, 54, 3, 3); ctx.fillRect(450, 54, 3, 3);  // eggs

      /* ---- sputnik floor lamp (far right, like the photo) ---- */
      ctx.fillStyle = "#8a6a3a";
      ctx.fillRect(448, 40, 2, 24);          // pole above dresser
      // starburst arms + warm bulbs
      const lampOn = !game.flags.powerOut && this.world.flickerOn;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + 0.3;
        const ex = 449 + Math.cos(ang) * 9;
        const ey = 34 + Math.sin(ang) * 9;
        ctx.strokeStyle = "#8a6a3a";
        ctx.beginPath(); ctx.moveTo(449, 34); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = lampOn ? "#ffd98a" : "#6a5a3a";
        ctx.fillRect(ex - 1, ey - 1, 3, 3);
      }

      /* ---- right wall + entry door ---- */
      ctx.fillStyle = "#7d7469";
      ctx.fillRect(456, 0, 24, this.H);
      ctx.fillStyle = "#6a6156";
      ctx.fillRect(456, 0, 3, this.H);       // wall corner shadow
      // the door (drawn here; knock/barricade dynamics in drawObjects)
      ctx.fillStyle = "#6f4d33";
      ctx.fillRect(459, 58, 19, 128);
      ctx.strokeStyle = "#583b25";
      ctx.strokeRect(462.5, 66.5, 12, 50);
      ctx.strokeRect(462.5, 122.5, 12, 56);
      ctx.fillStyle = "#dcbd60";
      ctx.fillRect(461, 118, 3, 5);          // knob
      ctx.fillStyle = "#2a2119";
      ctx.fillRect(468, 76, 3, 3);           // peephole

      /* ---- trellis rug (center, like the photo) ---- */
      ctx.fillStyle = "#d9d4ca";
      ctx.fillRect(64, 182, 186, 78);
      ctx.strokeStyle = "#a9a49a";
      ctx.lineWidth = 1;
      // diamond trellis pattern
      for (let x = 64; x < 250; x += 20) {
        for (let y = 182; y < 260; y += 20) {
          ctx.beginPath();
          ctx.moveTo(x + 10, y); ctx.lineTo(x + 20, y + 10);
          ctx.lineTo(x + 10, y + 20); ctx.lineTo(x, y + 10);
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.strokeStyle = "#8f8a80";
      ctx.strokeRect(66.5, 184.5, 181, 73);

      /* ---- wooden coffee table on the rug ---- */
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(98, 236, 92, 4);          // shadow
      ctx.fillStyle = "#6e4b2d";
      ctx.fillRect(96, 202, 92, 12);         // top
      ctx.fillStyle = "#583a20";
      ctx.fillRect(100, 214, 5, 22); ctx.fillRect(179, 214, 5, 22); // legs
      ctx.fillStyle = "#7d5735";
      ctx.fillRect(100, 224, 84, 4);         // lower shelf
      // items on the table
      ctx.fillStyle = "#8a3030"; ctx.fillRect(110, 198, 12, 4);   // book
      ctx.fillStyle = "#2f4f6a"; ctx.fillRect(112, 195, 12, 3);   // book
      ctx.fillStyle = "#caa25a"; ctx.fillRect(150, 197, 8, 5);    // bowl
      ctx.fillStyle = "#23262c"; ctx.fillRect(168, 199, 10, 3);   // remote

      /* ---- sectional couch (foreground, like the photo) ---- */
      // backrest
      ctx.fillStyle = "#ab9f8c";
      ctx.fillRect(230, 146, 162, 24);
      ctx.fillStyle = "#b6ab99";
      ctx.fillRect(232, 148, 158, 20);
      // right arm
      ctx.fillStyle = "#a2967f";
      ctx.fillRect(380, 146, 14, 70);
      // seat cushions
      ctx.fillStyle = "#c0b6a4";
      ctx.fillRect(230, 170, 150, 30);
      ctx.strokeStyle = "#a89d89";
      ctx.beginPath();
      ctx.moveTo(284, 170); ctx.lineTo(284, 200);
      ctx.moveTo(336, 170); ctx.lineTo(336, 200);
      ctx.stroke();
      // chaise section (extends toward viewer on the left)
      ctx.fillStyle = "#bab09d";
      ctx.fillRect(214, 200, 88, 44);
      ctx.strokeStyle = "#a89d89";
      ctx.strokeRect(216.5, 202.5, 83, 39);
      // front skirt
      ctx.fillStyle = "#9c917d";
      ctx.fillRect(302, 200, 92, 16);
      // pillows (mustard, charcoal, cream — from the photo)
      ctx.fillStyle = "#c9a13b";
      ctx.fillRect(238, 154, 22, 18);
      ctx.fillStyle = "#4a4a52";
      ctx.fillRect(298, 154, 20, 17);
      ctx.fillStyle = "#e4ddcc";
      ctx.fillRect(348, 155, 19, 16);
      // couch shadow
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(216, 244, 176, 4);
    },

    /* ------------------------------------------------------------
       Dynamic pieces over the static room.
       ------------------------------------------------------------ */
    drawObjects(game) {
      const ctx = this.ctx;

      // TV screen content (teal glow like the photo; reddens later)
      const tvOnNow = game.tvOn && this.world.flickerOn && !game.flags.powerOut;
      if (tvOnNow) {
        const base = game.phase >= 3 ? "#4a1a1e" : game.phase >= 2 ? "#3a4a3c" : "#155e66";
        ctx.fillStyle = base;
        ctx.fillRect(18, 34, 74, 54);
        ctx.fillStyle = game.phase >= 3 ? "rgba(220,90,80,0.35)" : "rgba(120,220,220,0.30)";
        ctx.fillRect(18, 34 + ((this.t * 26) % 50), 74, 3);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(18, 34, 74, 12);
      } else {
        ctx.fillStyle = "#070809";
        ctx.fillRect(18, 34, 74, 54);
      }

      // monitor glow on the desk
      if (!game.flags.powerOut && this.world.flickerOn) {
        ctx.fillStyle = game.phase >= 3 ? "rgba(210,80,70,0.55)" : "rgba(90,200,140,0.5)";
        ctx.fillRect(341, 59, 34, 22);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(341, 59 + ((this.t * 18) % 18), 34, 2);
      }

      // coffee maker ready-light + steam; hotplate coil when cooking
      const on = Math.sin(this.t * 3) > -0.5 && !game.flags.powerOut;
      ctx.fillStyle = on ? "#e0a83c" : "#5a4416";
      ctx.fillRect(410, 48, 3, 3);
      if (this.world.flickerOn && !game.flags.powerOut) {
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        for (let i = 0; i < 2; i++) {
          const sx = 413 + i * 5 + Math.sin(this.t * 2 + i) * 1.5;
          ctx.fillRect(sx, 42 - ((this.t * 6 + i * 3) % 7), 1, 2);
        }
      }
      if (game.fx.cooking > 0) {
        ctx.fillStyle = "rgba(255,120,60," + (0.5 + 0.4 * this.world.flame) + ")";
        ctx.beginPath(); ctx.arc(435, 60, 3, 0, Math.PI * 2); ctx.fill();
      }

      // barricades over the whole window + the door
      const win = game.byId("window");
      if (win) this.drawBarricade({ fx: 194, fy: 6, fw: 196, fh: 94 }, game.barricades.window);
      const door = game.byId("door");
      if (door) this.drawBarricade({ fx: 456, fy: 58, fw: 24, fh: 128 }, game.barricades.door);

      // knock indicator at the door
      if (game.doorKnocking) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 6));
        ctx.fillStyle = "rgba(210,70,60," + a + ")";
        ctx.font = "10px monospace";
        ctx.fillText("!", 464, 52);
      }

      // highlight the active interactable
      if (game.active && !game.anyScreenOpen()) {
        const o = game.active;
        ctx.strokeStyle = "rgba(126,195,107,0.8)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(o.fx - 1.5, o.fy - 1.5, o.fw + 3, o.fh + 3);
        ctx.setLineDash([]);
      }
    },

    drawBarricade(o, level) {
      if (!level) return;
      const ctx = this.ctx;
      for (let i = 0; i < level; i++) {
        const py = o.fy + 8 + i * ((o.fh - 16) / 3);
        ctx.save();
        ctx.translate(o.fx + o.fw / 2, py + 5);
        ctx.rotate((i % 2 ? 1 : -1) * 0.08);
        ctx.fillStyle = "#7a5a38";
        ctx.fillRect(-o.fw / 2 - 2, -3, o.fw + 4, 7);
        ctx.strokeStyle = "#4d391f";
        ctx.strokeRect(-o.fw / 2 - 2, -3, o.fw + 4, 7);
        ctx.fillStyle = "#c9c2b0";
        ctx.fillRect(-o.fw / 2, -1, 2, 2);
        ctx.fillRect(o.fw / 2 - 2, -1, 2, 2);
        ctx.restore();
      }
    },

    /* ------------------------------------------------------------
       The world outside the glass (per pane). Deteriorates with
       game.det: trash → abandoned car → smoke/fires → rubble &
       shamblers. Soldiers, helicopter and searchlights included.
       ------------------------------------------------------------ */
    drawOutside(o, game) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
      const seed = o.fx;

      // dusk sky (photo shows blue-grey clouds over a warm horizon)
      const day = 1 - w.dark;
      const sky = ctx.createLinearGradient(0, gy, 0, gy + gh);
      const top = this._mix([24, 30, 52], [122, 142, 168], day);
      const bot = this._mix([14, 16, 28], [214, 160, 118], day);
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
        ctx.arc(gx + gw * 0.75, gy + gh * 0.24, 5, 0, Math.PI * 2); ctx.fill();
      }

      // city skyline (photo shows mid-rise buildings)
      const base = gy + gh * 0.66;
      ctx.fillStyle = this._rgb(this._mix([12, 14, 20], [52, 56, 66], day * 0.5));
      for (let i = 0; i < 5; i++) {
        const bx = gx + ((i * 37 + seed) % (gw + 20)) - 10;
        const bw = 12 + ((i * 13 + seed) % 14);
        const bh = 18 + ((i * 17 + seed) % 26);
        ctx.fillRect(bx, base - bh, bw, bh);
        // lit windows
        if (Math.random() < 0.02 * day + 0.005) {
          ctx.fillStyle = "rgba(230,200,120,0.5)";
          ctx.fillRect(bx + 2, base - bh + 3, 2, 2);
          ctx.fillStyle = this._rgb(this._mix([12, 14, 20], [52, 56, 66], day * 0.5));
        }
      }

      // fire glow on the horizon during catastrophe
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
      ctx.beginPath();
      ctx.moveTo(gx, base + (gy + gh - base) / 2);
      ctx.lineTo(gx + gw, base + (gy + gh - base) / 2);
      ctx.stroke();

      /* ---- the outside world slowly deteriorating ---- */
      const det = game.det || 0;
      const streetH = gy + gh - base;

      if (det >= 1) {
        ctx.fillStyle = "rgba(140,130,110,0.5)";
        const bits = Math.min(9, Math.floor(det * 3));
        for (let i = 0; i < bits; i++) {
          const tx = gx + ((i * 53 + seed * 3) % gw);
          const ty = base + 2 + ((i * 29 + seed) % Math.max(2, streetH - 3));
          ctx.fillRect(tx, ty, 2, 1);
        }
        const px2 = gx + ((this.t * 5 + seed) % gw);
        ctx.fillStyle = "rgba(200,200,190,0.5)";
        ctx.fillRect(px2, base + 3 + Math.sin(this.t * 3 + seed) * 1.5, 2, 2);
      }

      if (det >= 2) {
        // abandoned car
        const cxx = gx + ((seed * 7) % Math.max(8, gw - 26)) + 4;
        ctx.fillStyle = "#3a3f47";
        ctx.fillRect(cxx, base + 1, 22, 5);
        ctx.fillStyle = "#262a30";
        ctx.fillRect(cxx + 3, base - 2, 13, 4);
        ctx.fillStyle = det >= 3 ? "#14161a" : "#59728a";
        ctx.fillRect(cxx + 5, base - 1, 4, 2);
        ctx.fillRect(cxx + 11, base - 1, 3, 2);
        ctx.fillStyle = "#101114";
        ctx.fillRect(cxx + 2, base + 5, 3, 2);
        ctx.fillRect(cxx + 16, base + 5, 3, 2);

        // smoke plumes / building fires
        for (let i = 0; i < 5; i++) {
          const bx = gx + ((i * 37 + seed) % (gw + 20)) - 10;
          const bw2 = 12 + ((i * 13 + seed) % 14);
          const bh2 = 18 + ((i * 17 + seed) % 26);
          if ((i + seed) % 3 === 0) {
            for (let s = 0; s < 6; s++) {
              const rise = (this.t * 8 + s * 5 + i * 7) % 30;
              const sx = bx + bw2 / 2 + Math.sin((this.t + s) * 1.3 + i) * (2 + rise * 0.15);
              const sy = base - bh2 - rise;
              if (sy < gy) continue;
              ctx.fillStyle = "rgba(90,90,95," + (0.35 * (1 - rise / 30)) + ")";
              ctx.fillRect(sx, sy, 2, 2);
            }
          }
          if (det >= 3 && (i + seed) % 4 === 1) {
            ctx.fillStyle = "rgba(255," + Math.floor(120 + 80 * w.flame) + ",40," + (0.5 + 0.4 * w.flame) + ")";
            ctx.fillRect(bx + 3, base - bh2 + 4, 3, 3);
          }
        }
      }

      if (det >= 4) {
        ctx.fillStyle = "#1c1a18";
        const rx = gx + ((seed * 11) % Math.max(6, gw - 14));
        ctx.fillRect(rx, base - 2, 10, 3);
        ctx.fillRect(rx + 2, base - 4, 6, 2);
        ctx.fillRect(rx + 4, base - 5, 2, 1);
      }

      // infected shamblers drifting through the wreckage
      for (const z of w.shamblers) {
        if (z.x < gx - 20 || z.x > gx + gw + 20) continue;
        const zx = z.x, zy = base + 2;
        const tw2 = Math.sin(z.t * 7) * 0.8;
        ctx.fillStyle = "#4e5c46";
        ctx.fillRect(zx - 2 + tw2, zy - 10, 5, 10);
        ctx.fillStyle = "#6a785c";
        ctx.fillRect(zx - 1 + tw2, zy - 13, 3, 3);
      }

      // soldiers on the street
      const sspr = this._spr("soldier");
      for (const s of w.soldiers) {
        if (s.x < gx - 20 || s.x > gx + gw + 20) continue;
        const sx = s.x, sy = base + 2;
        const bob = Math.sin(s.t * 6) * 0.6;
        if (sspr) {
          ctx.save();
          if (s.dir < 0) {
            ctx.translate(sx + 6, 0); ctx.scale(-1, 1); ctx.translate(-(sx + 6), 0);
          }
          ctx.drawImage(sspr, sx - 5, sy - 15 + bob, 10, 14);
          ctx.restore();
        } else {
          ctx.fillStyle = "#4a543c";
          ctx.fillRect(sx - 3, sy - 12 + bob, 6, 12);
        }
        if (w.dark > 0.4) {
          const g = ctx.createRadialGradient(sx, sy - 6, 1, sx, sy - 6, 22);
          g.addColorStop(0, "rgba(255,245,200,0.28)");
          g.addColorStop(1, "rgba(255,245,200,0)");
          ctx.fillStyle = g;
          ctx.fillRect(gx, gy, gw, gh);
        }
      }

      // helicopter sweeping the sky
      if (w.heli.active) {
        const hx = w.heli.x, hy = gy + w.heli.y * 0.4;
        if (hx + 30 > gx && hx - 30 < gx + gw) {
          const hspr = this._spr("helicopter");
          if (hspr) ctx.drawImage(hspr, hx - 16, hy, 32, 15);
          else { ctx.fillStyle = "#2a2e2a"; ctx.fillRect(hx - 12, hy + 4, 24, 5); }
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

    /* ---------- player ---------- */
    drawPlayer(game) {
      const ctx = this.ctx;
      const p = game.player;
      const spr = this._spr("player");
      const bob = p.moving ? Math.abs(Math.sin(p.animTime * 8)) * 1.5 : 0;
      const trem = p.stress > 70 ? (Math.random() - 0.5) * (p.stress - 70) / 30 : 0;
      const px = Math.round(p.x - p.w / 2 + trem);
      const py = Math.round(p.y - p.h / 2 - bob);

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
      let dark = w.flickerOn ? w.dark : Math.min(1, w.dark + 0.5);
      // fresh coffee sharpens the senses — the room feels brighter
      const boost = Math.min(1, (game.fx.coffee || 0) / 10);
      dark *= (1 - 0.3 * boost);
      if (dark <= 0.02) return;

      ctx.save();
      ctx.fillStyle = "rgba(4,5,10," + dark + ")";
      ctx.fillRect(0, 0, this.W, this.H);

      ctx.globalCompositeOperation = "destination-out";
      const p = game.player;
      this._lightPool(p.x, p.y, 70, 0.85 * (w.flickerOn ? 1 : 0.4));

      const powered = !game.flags.powerOut && w.flickerOn;
      if (game.tvOn && powered) this._lightPool(55, 62, 52, 0.6);      // TV glow
      if (powered) this._lightPool(358, 70, 36, 0.5);                  // monitor
      if (powered) this._lightPool(449, 40, 55, 0.55);                 // sputnik lamp
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

      const vg = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.W, this.H);

      if (stress > 45) {
        const s = (stress - 45) / 55;
        const pulse = 0.5 + 0.5 * Math.sin(this.t * (2 + s * 4));
        ctx.fillStyle = "rgba(120,10,14," + (s * 0.28 * pulse) + ")";
        ctx.fillRect(0, 0, this.W, this.H);
      }

      if (stress > 82 && Math.sin(this.t * 0.7) > 0.985) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        const hx = 40 + Math.random() * (this.W - 80);
        ctx.fillRect(hx, 120, 12, 60);
        ctx.beginPath(); ctx.arc(hx + 6, 116, 7, 0, Math.PI * 2); ctx.fill();
      }

      if (game.fx.flash > 0.01) {
        ctx.fillStyle = "rgba(255,255,255," + game.fx.flash + ")";
        ctx.fillRect(0, 0, this.W, this.H);
      }
      if (game.fx.redFlash > 0.01) {
        ctx.fillStyle = "rgba(180,20,20," + game.fx.redFlash + ")";
        ctx.fillRect(0, 0, this.W, this.H);
      }

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
       Peephole render (door modal).
       ------------------------------------------------------------ */
    drawPeephole(pctx, visitor, game) {
      const W = 180, H = 180;
      pctx.imageSmoothingEnabled = false;
      pctx.fillStyle = "#0a0b10";
      pctx.fillRect(0, 0, W, H);
      const g = pctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 95);
      g.addColorStop(0, "#2a2620");
      g.addColorStop(1, "#050507");
      pctx.fillStyle = g;
      pctx.fillRect(0, 0, W, H);

      pctx.fillStyle = "#191410";
      pctx.fillRect(0, 120, W, 60);

      const cx = W / 2;
      const drawSprite = (name, w2, h2, yOff) => {
        const img = Renderer._spr(name);
        if (img) pctx.drawImage(img, cx - w2 / 2, 120 - h2 + yOff, w2, h2);
      };

      switch (visitor.sprite) {
        case "soldier":
          drawSprite("soldier", 60, 78, 6);
          break;
        case "infected": {
          const tw = Math.sin(Renderer.t * 12) * 3;
          pctx.save();
          pctx.translate(tw, 0);
          pctx.fillStyle = "#5a6b4e";
          pctx.fillRect(cx - 16, 60, 32, 62);
          pctx.fillStyle = "#7a8a6a";
          pctx.beginPath(); pctx.arc(cx, 52, 15, 0, Math.PI * 2); pctx.fill();
          pctx.fillStyle = "#2a0a0a";
          pctx.fillRect(cx - 8, 78, 20, 26);
          pctx.fillStyle = "#c02020";
          pctx.fillRect(cx - 6, 48, 3, 3); pctx.fillRect(cx + 3, 48, 3, 3);
          pctx.fillStyle = "#1a0505";
          pctx.fillRect(cx - 5, 58, 10, 3);
          pctx.restore();
          break;
        }
        default: {
          const skin = visitor.sprite === "child" ? "#e6c0a0" : "#d8b088";
          const clothes = visitor.color || "#3a5a7a";
          const scale = visitor.sprite === "child" ? 0.7 : 1;
          const bodyH = 66 * scale;
          pctx.fillStyle = clothes;
          pctx.fillRect(cx - 14 * scale, 122 - bodyH, 28 * scale, bodyH);
          pctx.fillStyle = skin;
          pctx.beginPath(); pctx.arc(cx, 122 - bodyH - 8 * scale, 13 * scale, 0, Math.PI * 2); pctx.fill();
          pctx.fillStyle = "#2a1c14";
          pctx.fillRect(cx - 13 * scale, 122 - bodyH - 18 * scale, 26 * scale, 8 * scale);
          pctx.fillStyle = "#1a1a1a";
          pctx.fillRect(cx - 5 * scale, 122 - bodyH - 9 * scale, 3, 2);
          pctx.fillRect(cx + 3 * scale, 122 - bodyH - 9 * scale, 3, 2);
          break;
        }
      }

      const lens = pctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 92);
      lens.addColorStop(0, "rgba(0,0,0,0)");
      lens.addColorStop(0.8, "rgba(0,0,0,0.35)");
      lens.addColorStop(1, "rgba(0,0,0,0.95)");
      pctx.fillStyle = lens;
      pctx.fillRect(0, 0, W, H);

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
