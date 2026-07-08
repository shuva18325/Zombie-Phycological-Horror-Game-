/* ============================================================
   renderer.js — all canvas drawing
   Three homes, one layout: the CITY studio apartment (from the
   reference photo), the SUBURBAN family house (wainscot, curtains,
   family photos), and the RURAL farmhouse (plank walls, quilt bed,
   wood stove, oil lantern). The view outside the glass matches:
   city skyline, a street of neighbor houses, or open farmland with
   a barn and windmill — each deteriorating in its own way as the
   outbreak advances. Player walks with a real 4-frame cycle.
   Exposes: window.ZH.Renderer
   ============================================================ */
(function (ZH) {
  "use strict";

  const SPRITE_FILES = {
    player: "assets/sprites/player.png",
    player_slum: "assets/sprites/player_slum.png",
    house: "assets/sprites/house.png",
    tv: "assets/sprites/tv.png",
    computer: "assets/sprites/computer.png",
    window: "assets/sprites/window.png",
    door: "assets/sprites/door.png",
    helicopter: "assets/sprites/helicopter.png",
    soldier: "assets/sprites/soldier.png",
  };

  // The two window panes (glass areas).
  const PANES = [
    { fx: 198, fy: 10, fw: 88, fh: 84 },
    { fx: 296, fy: 10, fw: 88, fh: 84 },
  ];

  // Interior skins per area type.
  const THEMES = {
    city: {
      wallTop: "#a29a8d", wallBot: "#8d8578", trim: "#d9d5cb",
      floorA: "#c09a63", floorB: "#9d7c47",
      winFrame: "#17171b", curtains: null,
      couch: ["#ab9f8c", "#b6ab99", "#c0b6a4", "#a2967f", "#9c917d", "#bab09d"],
      door: "#6f4d33", doorTrim: "#583b25",
      rug: "trellis", art: "mountain", lamp: "sputnik", quilt: false, stove: false,
      planks: false, wainscot: false,
    },
    suburb: {
      wallTop: "#b3a48b", wallBot: "#9c8d74", trim: "#e6e1d5",
      floorA: "#a97c4c", floorB: "#875f3a",
      winFrame: "#e8e4da", curtains: "#b98a6a",
      couch: ["#7d8d7d", "#8a9a8a", "#97a797", "#748474", "#6d7d6d", "#8f9f8f"],
      door: "#7a3c34", doorTrim: "#5e2c26",
      rug: "solid", art: "photos", lamp: "shade", quilt: false, stove: false,
      planks: false, wainscot: true,
    },
    rural: {
      wallTop: "#8f6f4d", wallBot: "#7a5c3e", trim: "#6e5236",
      floorA: "#8a6238", floorB: "#6f4c2c",
      winFrame: "#e8e4da", curtains: "#a34a3a",
      couch: ["#8a7458", "#9a8468", "#a89272", "#7d6850", "#75604a", "#93805f"],
      door: "#5c452e", doorTrim: "#453322",
      rug: "braided", art: "sampler", lamp: "lantern", quilt: true, stove: true,
      planks: true, wainscot: false,
    },
    // The shared one-room home in the lane (yellow-green walls,
    // corrugated ceiling, crowded shelves, floor mats, four friends).
    slum: {
      slum: true,
      wallTop: "#a8a24e", wallBot: "#8f8946", trim: "#6e6a3a",
      floorA: "#9a9282", floorB: "#7d7568",
      winFrame: "#4a6a72", curtains: "#8a4a7a",
      couch: null,
      door: "#5a6a72", doorTrim: "#43525a",
      rug: "mats", art: "shrine", lamp: "bulb", quilt: false, stove: false,
      planks: false, wainscot: false,
    },
  };

  // Your four housemates, on the mats. The reason your stress stays low.
  const HOUSEMATES = [
    { x: 258, y: 196, shirt: "#c05a3a", skin: "#a0663a" },  // Ravi
    { x: 296, y: 210, shirt: "#3a7ac0", skin: "#8a5a34" },  // Arjun
    { x: 334, y: 198, shirt: "#3aa06a", skin: "#a0663a" },  // Sana
    { x: 366, y: 214, shirt: "#c0a03a", skin: "#8a5a34" },  // Meera
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
      dark: 0, targetDark: 0,
      redSky: 0, targetRed: 0,
      soldiers: [], shamblers: [],
      heli: { active: false, x: -60, y: 26 },
      flame: 0, stars: [], flickerOn: true,
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

    _theme(game) {
      if (game.zoneId === "slum") return THEMES.slum;
      return THEMES[game.areaId] || THEMES.city;
    },

    /* ------------------------------------------------------------ */
    update(dt, game) {
      this.t += dt;
      const w = this.world;
      const f = game.flags;

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

      if (f.soldiersOutside && w.soldiers.length < 2 && Math.random() < dt * 0.4) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        w.soldiers.push({
          x: dir === 1 ? -20 : this.W + 20,
          dir, speed: 12 + Math.random() * 8, t: Math.random() * 10,
        });
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

    /* ------------------------------------------------------------ */
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
       THE HOME (skinned per area: apartment / house / farmhouse)
       ============================================================ */
    drawRoom(game) {
      const ctx = this.ctx;
      const T = this._theme(game);
      if (T.slum) { this.drawSlumRoom(game); return; }

      /* ---- back wall ---- */
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 112);
      wallGrad.addColorStop(0, T.wallTop);
      wallGrad.addColorStop(1, T.wallBot);
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, this.W, 112);
      if (T.planks) {
        ctx.strokeStyle = "rgba(60,40,20,0.35)";
        ctx.lineWidth = 1;
        for (let y = 14; y < 106; y += 14) {
          ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(this.W, y + 0.5); ctx.stroke();
        }
      }
      if (T.wainscot) {
        ctx.fillStyle = T.trim;
        ctx.fillRect(0, 78, this.W, 28);
        ctx.strokeStyle = "rgba(140,125,105,0.5)";
        for (let x = 10; x < this.W; x += 22) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 80); ctx.lineTo(x + 0.5, 104); ctx.stroke();
        }
      }
      if (T.slum) {
        // rough damp patches on the painted wall
        ctx.fillStyle = "rgba(90,110,90,0.25)";
        ctx.fillRect(40, 30, 26, 18);
        ctx.fillRect(250, 14, 20, 12);
        ctx.fillRect(440, 70, 14, 20);
        // corrugated metal ceiling
        ctx.fillStyle = "#8a8d92";
        ctx.fillRect(0, 0, this.W, 8);
        ctx.strokeStyle = "#6b6e73";
        for (let x = 0; x < this.W; x += 8) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 8); ctx.stroke();
        }
        // clothesline with hanging clothes (top-left, like the photo)
        ctx.strokeStyle = "#3a3226";
        ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(104, 20); ctx.stroke();
        const cloth = [["#c9a13b", 12], ["#3a7ac0", 34], ["#c05a8a", 56], ["#e4ddcc", 78]];
        for (const [col, cx2] of cloth) {
          ctx.fillStyle = col;
          ctx.fillRect(cx2, 16 + (cx2 % 3), 14, 11);
        }
      }
      ctx.fillStyle = T.trim;
      ctx.fillRect(0, 106, this.W, 6);

      /* ---- floor ---- */
      const floorGrad = ctx.createLinearGradient(0, 112, 0, this.H);
      floorGrad.addColorStop(0, T.floorA);
      floorGrad.addColorStop(1, T.floorB);
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 112, this.W, this.H - 112);
      if (T.slum) {
        // worn stone tiles
        ctx.strokeStyle = "rgba(60,58,50,0.35)";
        ctx.lineWidth = 1;
        for (let y = 112; y < this.H; y += 26) {
          ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(this.W, y + 0.5); ctx.stroke();
        }
        for (let x = 0; x < this.W; x += 30) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 112); ctx.lineTo(x + 0.5, this.H); ctx.stroke();
        }
        // a stained tile or two
        ctx.fillStyle = "rgba(90,80,60,0.3)";
        ctx.fillRect(60, 190, 30, 26);
        ctx.fillRect(390, 216, 30, 26);
      } else {
        ctx.strokeStyle = "rgba(60,38,18,0.30)";
        ctx.lineWidth = 1;
        const plankH = T.planks ? 24 : 18;
        for (let y = 112 + plankH; y < this.H; y += plankH) {
          ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(this.W, y + 0.5); ctx.stroke();
        }
        for (let x = 30; x < this.W; x += 60) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 112); ctx.lineTo(x + 0.5, this.H); ctx.stroke();
        }
      }

      /* ---- windows: frames + the world outside ---- */
      ctx.fillStyle = T.winFrame;
      ctx.fillRect(194, 4, 96, 96);
      ctx.fillRect(292, 4, 96, 96);
      for (const p of PANES) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.fx, p.fy, p.fw, p.fh);
        ctx.clip();
        this.drawOutside(p, game);
        ctx.restore();
        ctx.fillStyle = T.winFrame;
        ctx.fillRect(p.fx + p.fw / 2 - 1, p.fy, 2, p.fh);
        ctx.fillRect(p.fx, p.fy + p.fh / 2 - 1, p.fw, 2);
      }
      // curtains (suburb & farmhouse)
      if (T.curtains) {
        ctx.fillStyle = T.curtains;
        for (const p of PANES) {
          ctx.fillRect(p.fx - 3, p.fy - 4, 9, p.fh + 8);
          ctx.fillRect(p.fx + p.fw - 6, p.fy - 4, 9, p.fh + 8);
          ctx.fillRect(p.fx - 3, p.fy - 6, p.fw + 6, 5);
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(p.fx - 1, p.fy - 4, 2, p.fh + 8);
          ctx.fillRect(p.fx + p.fw - 1, p.fy - 4, 2, p.fh + 8);
          ctx.fillStyle = T.curtains;
        }
      }
      // sill + plants
      ctx.fillStyle = T.trim;
      ctx.fillRect(192, 98, 198, 7);
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

      /* ---- wall art (mountain print / family photos / sampler) ---- */
      if (T.art === "mountain") {
        ctx.fillStyle = "#e8e4dc";
        ctx.fillRect(112, 4, 34, 28);
        ctx.fillStyle = "#b9c7cf";
        ctx.fillRect(115, 7, 28, 22);
        ctx.fillStyle = "#5d7286";
        ctx.beginPath();
        ctx.moveTo(115, 29); ctx.lineTo(124, 15); ctx.lineTo(131, 29);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#3c4e60";
        ctx.beginPath();
        ctx.moveTo(125, 29); ctx.lineTo(135, 11); ctx.lineTo(143, 29);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e8e4dc";
        ctx.fillRect(134, 13, 3, 2);
      } else if (T.art === "photos") {
        // three family photo frames
        const frames = [[110, 6, 14, 18], [128, 10, 12, 14], [144, 5, 13, 16]];
        for (const [fx2, fy2, fw2, fh2] of frames) {
          ctx.fillStyle = "#4a3a2a";
          ctx.fillRect(fx2, fy2, fw2, fh2);
          ctx.fillStyle = "#d8cfc0";
          ctx.fillRect(fx2 + 2, fy2 + 2, fw2 - 4, fh2 - 4);
          ctx.fillStyle = "#8a7a68";
          ctx.fillRect(fx2 + 4, fy2 + 5, fw2 - 8, fh2 - 9);
          ctx.fillStyle = "#d8b088";
          ctx.fillRect(fx2 + fw2 / 2 - 2, fy2 + 5, 4, 4); // little face
        }
      } else if (T.art === "shrine") {
        // framed Taj Mahal print + the shrine shelf with a burning diya
        ctx.fillStyle = "#8a6a2a";
        ctx.fillRect(110, 8, 38, 26);
        ctx.fillStyle = "#2a4a6a";
        ctx.fillRect(113, 11, 32, 20);
        ctx.fillStyle = "#e8e4dc";               // the Taj
        ctx.fillRect(122, 18, 14, 10);
        ctx.beginPath();
        ctx.arc(129, 18, 5, Math.PI, 0); ctx.fill();
        ctx.fillRect(115, 16, 2, 12); ctx.fillRect(141, 16, 2, 12); // minarets
        // shrine shelf
        ctx.fillStyle = "#6e5236";
        ctx.fillRect(152, 26, 30, 3);
        ctx.fillStyle = "#c9553a";
        ctx.fillRect(156, 16, 8, 10);            // little idol
        ctx.fillStyle = "#e0a83c";
        ctx.fillRect(158, 13, 4, 4);
        // diya flame (flickers)
        ctx.fillStyle = "#8a6234";
        ctx.fillRect(170, 22, 6, 4);
        ctx.fillStyle = "rgba(255," + Math.floor(150 + 80 * this.world.flame) + ",60,0.95)";
        ctx.fillRect(172, 18 - Math.round(this.world.flame), 2, 4);
      } else {
        // cross-stitch "HOME" sampler
        ctx.fillStyle = "#5c452e";
        ctx.fillRect(112, 4, 40, 28);
        ctx.fillStyle = "#e8e0cc";
        ctx.fillRect(115, 7, 34, 22);
        ctx.fillStyle = "#a34a3a";
        // H O M E in chunky pixels
        ctx.fillRect(118, 12, 2, 8); ctx.fillRect(122, 12, 2, 8); ctx.fillRect(118, 15, 6, 2);
        ctx.fillRect(126, 12, 6, 2); ctx.fillRect(126, 18, 6, 2); ctx.fillRect(126, 12, 2, 8); ctx.fillRect(130, 12, 2, 8);
        ctx.fillRect(134, 12, 2, 8); ctx.fillRect(139, 12, 2, 8); ctx.fillRect(136, 13, 1, 2); ctx.fillRect(138, 13, 1, 2);
        ctx.fillRect(143, 12, 6, 2); ctx.fillRect(143, 15, 4, 2); ctx.fillRect(143, 18, 6, 2); ctx.fillRect(143, 12, 2, 8);
        ctx.fillStyle = "#3f6a3a";
        ctx.fillRect(117, 24, 30, 2); // little stitched vine
      }

      /* ---- TV on console ---- */
      ctx.fillStyle = T.trim;
      ctx.fillRect(8, 92, 96, 18);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(8, 100, 96, 2);
      ctx.fillStyle = T.trim;
      ctx.fillRect(12, 110, 4, 4); ctx.fillRect(96, 110, 4, 4);
      ctx.fillStyle = "#0d0f13";
      ctx.fillRect(14, 30, 82, 62);

      /* ---- ladder shelf ---- */
      ctx.fillStyle = T.trim;
      ctx.fillRect(108, 36, 3, 76);
      ctx.fillRect(130, 36, 3, 76);
      for (const sy of [48, 68, 88, 106]) ctx.fillRect(108, sy, 25, 3);
      ctx.fillStyle = "#7a4a3a"; ctx.fillRect(112, 42, 4, 6);
      ctx.fillStyle = "#3a5a7a"; ctx.fillRect(117, 40, 4, 8);
      ctx.fillStyle = "#4a7a3a"; ctx.fillRect(124, 60, 5, 8);
      ctx.fillStyle = "#a35a34"; ctx.fillRect(124, 66, 5, 2);
      ctx.fillStyle = "#c9a13b"; ctx.fillRect(113, 82, 6, 6);

      /* ---- the bed (quilted on the farm) ---- */
      ctx.fillStyle = "#8f8f94";
      ctx.fillRect(138, 56, 94, 18);
      ctx.fillStyle = "#f4f2ec";
      ctx.fillRect(144, 62, 36, 14);
      ctx.fillRect(186, 62, 36, 14);
      ctx.strokeStyle = "#d8d4c9";
      ctx.strokeRect(144.5, 62.5, 35, 13);
      ctx.strokeRect(186.5, 62.5, 35, 13);
      if (T.slum) {
        // bright printed bedcover (red & gold, like the photo)
        ctx.fillStyle = "#9a2430";
        ctx.fillRect(136, 74, 96, 54);
        ctx.fillStyle = "#c9a13b";
        for (let qy = 0; qy < 3; qy++) {
          for (let qx = 0; qx < 6; qx++) {
            const dx = 146 + qx * 16, dy = 82 + qy * 16;
            ctx.fillRect(dx, dy + 3, 3, 3);
            ctx.fillRect(dx + 3, dy, 3, 3);
            ctx.fillRect(dx + 6, dy + 3, 3, 3);
            ctx.fillRect(dx + 3, dy + 6, 3, 3);
          }
        }
        ctx.fillStyle = "#e8d44d";
        ctx.fillRect(136, 122, 96, 4);           // gold border
        ctx.strokeStyle = "rgba(60,10,15,0.4)";
        ctx.strokeRect(136.5, 74.5, 95, 53);
      } else if (T.quilt) {
        // patchwork quilt
        const cols = ["#a34a3a", "#3a5a7a", "#c9a13b", "#e8e0cc"];
        for (let qy = 0; qy < 4; qy++) {
          for (let qx = 0; qx < 8; qx++) {
            ctx.fillStyle = cols[(qx + qy) % cols.length];
            ctx.fillRect(136 + qx * 12, 74 + qy * 13, 12, 13);
          }
        }
        ctx.strokeStyle = "rgba(80,50,30,0.25)";
        ctx.strokeRect(136.5, 74.5, 95, 53);
      } else {
        ctx.fillStyle = "#eceae2";
        ctx.fillRect(136, 74, 96, 54);
        ctx.fillStyle = "#dcd9cf";
        ctx.fillRect(136, 96, 96, 3);
      }
      ctx.fillStyle = "#75757a";
      ctx.fillRect(136, 128, 96, 12);
      ctx.fillStyle = "#5c5c61";
      ctx.fillRect(138, 140, 8, 4); ctx.fillRect(226, 140, 8, 4);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(136, 144, 96, 3);

      /* ---- desk + monitor + chair ---- */
      ctx.fillStyle = "#8a6a48";
      ctx.fillRect(316, 84, 84, 6);
      ctx.fillStyle = "#6e5236";
      ctx.fillRect(318, 90, 4, 22); ctx.fillRect(394, 90, 4, 22);
      ctx.fillStyle = "#101216";
      ctx.fillRect(338, 56, 40, 28);
      ctx.fillRect(354, 84, 8, 3);
      ctx.fillStyle = "#23262c";
      ctx.fillRect(340, 86, 24, 3);
      ctx.fillStyle = "#1c1e24";
      ctx.fillRect(344, 94, 26, 22);
      ctx.fillStyle = "#26282f";
      ctx.fillRect(340, 116, 34, 10);
      ctx.fillStyle = "#15161a";
      ctx.fillRect(354, 126, 5, 10);
      ctx.fillRect(344, 136, 26, 3);

      /* ---- kitchenette: dresser + coffee + (hotplate | wood stove) ---- */
      if (T.slum) {
        // steel fridge (like the photo) + chai pot on a crate
        ctx.fillStyle = "#b8bcc0";
        ctx.fillRect(428, 40, 26, 72);
        ctx.fillStyle = "#9a9ea3";
        ctx.fillRect(428, 66, 26, 3);            // freezer line
        ctx.fillRect(430, 48, 2, 12);            // handle
        ctx.fillRect(430, 74, 2, 16);
        ctx.fillStyle = "#7d8186";
        ctx.fillRect(428, 108, 26, 4);
        // crate under the chai/coffee pot
        ctx.fillStyle = "#8a6a3a";
        ctx.fillRect(404, 64, 22, 48);
        ctx.strokeStyle = "#5e4626";
        ctx.strokeRect(406.5, 70.5, 17, 16);
        ctx.strokeRect(406.5, 90.5, 17, 16);
        // steel pots stacked beside
        ctx.fillStyle = "#c9cdd2";
        ctx.fillRect(408, 58, 12, 4);
        ctx.fillRect(410, 54, 8, 4);
      } else {
      ctx.fillStyle = "#97713f";
      ctx.fillRect(404, 64, 50, 48);
      ctx.strokeStyle = "#6e4f28";
      ctx.strokeRect(408.5, 70.5, 41, 12);
      ctx.strokeRect(408.5, 86.5, 41, 12);
      ctx.fillStyle = "#e0c47a";
      ctx.fillRect(427, 74, 4, 3); ctx.fillRect(427, 90, 4, 3);
      }
      // coffee maker / chai pot (same spot in every home)
      ctx.fillStyle = "#1d1f24";
      ctx.fillRect(408, 46, 16, 18);
      ctx.fillStyle = "#101116";
      ctx.fillRect(410, 54, 12, 8);
      if (T.stove) {
        // iron wood stove with pipe
        ctx.fillStyle = "#22242a";
        ctx.fillRect(428, 40, 22, 24);
        ctx.fillStyle = "#15171c";
        ctx.fillRect(436, 6, 6, 34);           // pipe up the wall
        ctx.fillRect(432, 46, 14, 10);         // fire door
        ctx.fillStyle = "rgba(255,120,50," + (0.35 + 0.3 * this.world.flame) + ")";
        ctx.fillRect(434, 48, 10, 6);          // ember glow
        ctx.fillStyle = "#3a3d44";
        ctx.fillRect(430, 62, 4, 3); ctx.fillRect(444, 62, 4, 3); // legs
      } else if (!T.slum) {
        // hotplate + basket
        ctx.fillStyle = "#2a2c31";
        ctx.fillRect(428, 56, 14, 8);
        ctx.fillStyle = "#3a3d44";
        ctx.beginPath(); ctx.arc(435, 60, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#8a6234";
        ctx.fillRect(444, 56, 10, 8);
        ctx.fillStyle = "#efe9da";
        ctx.fillRect(446, 54, 3, 3); ctx.fillRect(450, 54, 3, 3);
      }

      /* ---- the lamp (sputnik / shaded / oil lantern) ---- */
      const lampOn = !game.flags.powerOut && this.world.flickerOn;
      if (T.lamp === "sputnik") {
        ctx.fillStyle = "#8a6a3a";
        ctx.fillRect(448, 40, 2, 24);
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2 + 0.3;
          const ex = 449 + Math.cos(ang) * 9;
          const ey = 34 + Math.sin(ang) * 9;
          ctx.strokeStyle = "#8a6a3a";
          ctx.beginPath(); ctx.moveTo(449, 34); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.fillStyle = lampOn ? "#ffd98a" : "#6a5a3a";
          ctx.fillRect(ex - 1, ey - 1, 3, 3);
        }
      } else if (T.lamp === "shade") {
        ctx.fillStyle = "#6a5a48";
        ctx.fillRect(448, 34, 2, 30);
        ctx.fillStyle = lampOn ? "#e8ce9a" : "#8a7a60";
        ctx.beginPath();
        ctx.moveTo(442, 34); ctx.lineTo(456, 34); ctx.lineTo(452, 22); ctx.lineTo(446, 22);
        ctx.closePath(); ctx.fill();
      } else if (T.lamp === "bulb") {
        // one bare bulb on a wire from the corrugated ceiling
        ctx.strokeStyle = "#2a2620";
        ctx.beginPath(); ctx.moveTo(240, 8); ctx.lineTo(240, 26); ctx.stroke();
        ctx.fillStyle = "#3a3630";
        ctx.fillRect(237, 26, 6, 4);
        ctx.fillStyle = lampOn ? "#ffe9a0" : "#6a6250";
        ctx.beginPath(); ctx.arc(240, 34, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        // oil lantern hanging by the door
        ctx.strokeStyle = "#3a3226";
        ctx.beginPath(); ctx.moveTo(449, 20); ctx.lineTo(449, 30); ctx.stroke();
        ctx.fillStyle = "#3a3226";
        ctx.fillRect(444, 30, 10, 3);
        ctx.fillStyle = lampOn ? "#ffca6a" : "#6a5a3a";
        ctx.fillRect(445, 33, 8, 10);
        ctx.fillStyle = "#3a3226";
        ctx.fillRect(444, 43, 10, 3);
      }

      /* ---- right wall + entry door ---- */
      ctx.fillStyle = T.wallBot;
      ctx.fillRect(456, 0, 24, this.H);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(456, 0, 3, this.H);
      ctx.fillStyle = T.door;
      ctx.fillRect(459, 58, 19, 128);
      ctx.strokeStyle = T.doorTrim;
      ctx.strokeRect(462.5, 66.5, 12, 50);
      ctx.strokeRect(462.5, 122.5, 12, 56);
      ctx.fillStyle = "#dcbd60";
      ctx.fillRect(461, 118, 3, 5);
      ctx.fillStyle = "#2a2119";
      ctx.fillRect(468, 76, 3, 3);

      /* ---- rug (trellis / solid / braided) ---- */
      if (T.rug === "trellis") {
        ctx.fillStyle = "#d9d4ca";
        ctx.fillRect(64, 182, 186, 78);
        ctx.strokeStyle = "#a9a49a";
        ctx.lineWidth = 1;
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
      } else if (T.rug === "solid") {
        ctx.fillStyle = "#7a4a44";
        ctx.fillRect(64, 182, 186, 78);
        ctx.strokeStyle = "#9a6a5a";
        ctx.lineWidth = 2;
        ctx.strokeRect(70, 188, 174, 66);
        ctx.strokeStyle = "#5e3833";
        ctx.lineWidth = 1;
        ctx.strokeRect(66.5, 184.5, 181, 73);
      } else if (T.rug === "mats") {
        // woven floor mats where everyone sits
        ctx.fillStyle = "#7a8a4a";
        ctx.fillRect(70, 196, 110, 52);
        ctx.strokeStyle = "#5e6a38";
        ctx.strokeRect(74.5, 200.5, 101, 43);
        ctx.fillStyle = "#8a4a6a";
        ctx.fillRect(240, 188, 150, 56);
        ctx.strokeStyle = "#6a3852";
        ctx.strokeRect(244.5, 192.5, 141, 47);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        for (let x = 250; x < 386; x += 10) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 192); ctx.lineTo(x + 0.5, 240); ctx.stroke();
        }
      } else {
        // braided oval
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = ["#8a5a3a", "#a37a4a", "#6e4a2e", "#96713f", "#7d5735"][i];
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.ellipse(157, 221, 88 - i * 16, 36 - i * 6.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      }

      /* ---- coffee table ---- */
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(98, 236, 92, 4);
      ctx.fillStyle = "#6e4b2d";
      ctx.fillRect(96, 202, 92, 12);
      ctx.fillStyle = "#583a20";
      ctx.fillRect(100, 214, 5, 22); ctx.fillRect(179, 214, 5, 22);
      ctx.fillStyle = "#7d5735";
      ctx.fillRect(100, 224, 84, 4);
      ctx.fillStyle = "#8a3030"; ctx.fillRect(110, 198, 12, 4);
      ctx.fillStyle = "#2f4f6a"; ctx.fillRect(112, 195, 12, 3);
      ctx.fillStyle = "#caa25a"; ctx.fillRect(150, 197, 8, 5);
      ctx.fillStyle = "#23262c"; ctx.fillRect(168, 199, 10, 3);

      /* ---- sectional couch — or the four friends on the mats ---- */
      if (T.slum) {
        for (let i = 0; i < HOUSEMATES.length; i++) {
          const hm = HOUSEMATES[i];
          const bob = Math.sin(this.t * 1.6 + i * 1.7) * 0.8;
          // shadow
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.ellipse(hm.x + 5, hm.y + 18, 7, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          // crossed legs
          ctx.fillStyle = "#3a3630";
          ctx.fillRect(hm.x - 2, hm.y + 13, 14, 5);
          // body
          ctx.fillStyle = hm.shirt;
          ctx.fillRect(hm.x, hm.y + bob, 10, 14);
          // head
          ctx.fillStyle = hm.skin;
          ctx.fillRect(hm.x + 2, hm.y - 7 + bob, 7, 7);
          // hair
          ctx.fillStyle = "#181410";
          ctx.fillRect(hm.x + 1, hm.y - 9 + bob, 9, 4);
          // a steel cup of chai in someone's hands
          if (i === 2) {
            ctx.fillStyle = "#c9cdd2";
            ctx.fillRect(hm.x + 10, hm.y + 6 + bob, 3, 4);
          }
        }
        return; // no couch, no coffee table clutter changes
      }
      const C = T.couch;
      ctx.fillStyle = C[0];
      ctx.fillRect(230, 146, 162, 24);
      ctx.fillStyle = C[1];
      ctx.fillRect(232, 148, 158, 20);
      ctx.fillStyle = C[3];
      ctx.fillRect(380, 146, 14, 70);
      ctx.fillStyle = C[2];
      ctx.fillRect(230, 170, 150, 30);
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.moveTo(284, 170); ctx.lineTo(284, 200);
      ctx.moveTo(336, 170); ctx.lineTo(336, 200);
      ctx.stroke();
      ctx.fillStyle = C[5];
      ctx.fillRect(214, 200, 88, 44);
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.strokeRect(216.5, 202.5, 83, 39);
      ctx.fillStyle = C[4];
      ctx.fillRect(302, 200, 92, 16);
      ctx.fillStyle = "#c9a13b";
      ctx.fillRect(238, 154, 22, 18);
      ctx.fillStyle = "#4a4a52";
      ctx.fillRect(298, 154, 20, 17);
      ctx.fillStyle = "#e4ddcc";
      ctx.fillRect(348, 155, 19, 16);
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(216, 244, 176, 4);
    },

    /* ============================================================
       THE LANE ROOM — one small, poor, crowded, loved room.
       Blue rough plaster, god-shelf, calendars, old wood-cased CRT
       on a wall bracket, gingham bed, red cupboard, tarp pile.
       ============================================================ */
    drawSlumRoom(game) {
      const ctx = this.ctx;
      const kit = game.byId("kitchen"), bed = game.byId("bed"),
            win = game.byId("window"), pho = game.byId("computer"),
            tv = game.byId("tv"), door = game.byId("door");
      const L = 140, R = 344; // the room is TINY — thick walls close in

      /* everything beyond the walls: neighbors' brick + corrugation */
      ctx.fillStyle = "#242e33";
      ctx.fillRect(0, 0, this.W, this.H);
      // neighbor brick texture, left
      ctx.fillStyle = "#3a2f28";
      ctx.fillRect(0, 0, L - 10, this.H);
      ctx.strokeStyle = "rgba(20,14,10,0.5)";
      for (let y = 0; y < this.H; y += 12) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(L - 10, y + 0.5); ctx.stroke();
      }
      for (let x = 0; x < L - 10; x += 22) {
        const off = ((x / 22) % 2) * 6;
        for (let y = off; y < this.H; y += 24) {
          ctx.beginPath(); ctx.moveTo(x + 11, y); ctx.lineTo(x + 11, y + 12); ctx.stroke();
        }
      }
      // neighbor corrugation, right
      ctx.fillStyle = "#4a5258";
      ctx.fillRect(R + 26, 0, this.W - R - 26, this.H);
      ctx.strokeStyle = "rgba(20,22,26,0.6)";
      for (let x = R + 26; x < this.W; x += 7) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, this.H); ctx.stroke();
      }
      // our own wall returns (the thickness of the walls themselves)
      ctx.fillStyle = "#2c5d6a";
      ctx.fillRect(L - 10, 0, 10, this.H);
      ctx.fillRect(R + 16, 0, 10, this.H);
      ctx.fillStyle = "#27525e";
      ctx.fillRect(L - 4, 0, 4, this.H);
      ctx.fillRect(R + 16, 0, 4, this.H);

      /* rough blue plaster back wall (only as wide as the room) */
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 104);
      wallGrad.addColorStop(0, "#3f8494");
      wallGrad.addColorStop(1, "#326b78");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(L, 10, R + 16 - L, 94);
      for (let i = 0; i < 8; i++) {
        const mx = L + (i * 47) % (R - L - 20), my = 14 + (i * 31) % 80;
        ctx.fillStyle = i % 3 ? "rgba(20,50,60,0.18)" : "rgba(180,220,225,0.08)";
        ctx.fillRect(mx, my, 12 + (i * 7) % 14, 7 + (i * 5) % 10);
      }

      /* corrugated ceiling strip + the bulb wire */
      ctx.fillStyle = "#7d8085";
      ctx.fillRect(L, 0, R + 16 - L, 10);
      ctx.strokeStyle = "#5e6166";
      for (let x = L; x < R + 16; x += 7) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 10); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(15,12,10,0.8)";
      ctx.beginPath(); ctx.moveTo(242, 10); ctx.lineTo(242, 26); ctx.stroke();

      /* worn tile floor */
      const floorGrad = ctx.createLinearGradient(0, 104, 0, this.H);
      floorGrad.addColorStop(0, "#8f887c");
      floorGrad.addColorStop(1, "#6e6558");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(L, 104, R + 16 - L, this.H - 104);
      ctx.strokeStyle = "rgba(50,45,38,0.4)";
      for (let y = 104; y < this.H; y += 22) {
        ctx.beginPath(); ctx.moveTo(L, y + 0.5); ctx.lineTo(R + 16, y + 0.5); ctx.stroke();
      }
      for (let x = L; x < R + 16; x += 24) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 104); ctx.lineTo(x + 0.5, this.H); ctx.stroke();
      }
      ctx.fillStyle = "rgba(70,60,45,0.35)";
      ctx.fillRect(200, 150, 22, 18);
      ctx.fillRect(290, 210, 24, 20);

      /* baseboard shadowline where wall meets floor */
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(L, 102, R + 16 - L, 3);

      /* god-shelf over the cupboard + garland */
      ctx.fillStyle = "#24525e";
      ctx.fillRect(kit.fx - 2, 22, 34, 3);
      ctx.fillStyle = "#c9762e";
      ctx.fillRect(kit.fx, 12, 9, 10);
      ctx.fillStyle = "#e8d44d";
      ctx.fillRect(kit.fx + 2, 14, 5, 5);
      ctx.fillStyle = "#7a3a8a";
      ctx.fillRect(kit.fx + 13, 13, 8, 9);
      ctx.fillStyle = "#e0a83c";
      ctx.fillRect(kit.fx + 15, 15, 4, 4);
      ctx.fillStyle = "#e8a020";
      for (let i = 0; i < 5; i++) ctx.fillRect(kit.fx + i * 7, 26 + (i % 2) * 2, 3, 3);

      /* Om plate + one calendar + pink clock, squeezed on the wall */
      ctx.fillStyle = "#c98a2e";
      ctx.beginPath(); ctx.arc(216, 30, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#5e3a10";
      ctx.beginPath(); ctx.arc(214, 31, 4, 0.5, Math.PI * 1.6); ctx.stroke();
      ctx.fillStyle = "#5e3a10";
      ctx.fillRect(217, 25, 2, 2);
      ctx.fillStyle = "#e8e4da";
      ctx.fillRect(226, 42, 20, 30);
      ctx.fillStyle = "#a03028";
      ctx.fillRect(226, 42, 20, 6);
      ctx.strokeStyle = "rgba(60,60,80,0.5)";
      for (let y = 52; y < 70; y += 5) {
        ctx.beginPath(); ctx.moveTo(228, y); ctx.lineTo(244, y); ctx.stroke();
      }
      ctx.fillStyle = "#d88aa0";
      ctx.beginPath(); ctx.arc(210, 56, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f4eef0";
      ctx.beginPath(); ctx.arc(210, 56, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(210, 56); ctx.lineTo(210, 53);
      ctx.moveTo(210, 56); ctx.lineTo(212, 57);
      ctx.stroke();

      /* the bare bulb */
      const lampOn = !game.flags.powerOut && this.world.flickerOn;
      ctx.fillStyle = "#3a3630";
      ctx.fillRect(239, 26, 6, 4);
      ctx.fillStyle = lampOn ? "#ffe9a0" : "#6a6250";
      ctx.beginPath(); ctx.arc(242, 34, 4, 0, Math.PI * 2); ctx.fill();

      /* red steel cupboard (kitchen) + chai ring */
      ctx.fillStyle = "#8a2822";
      ctx.fillRect(kit.fx, kit.fy + 6, 30, kit.fh - 12);
      ctx.fillStyle = "#a03028";
      ctx.fillRect(kit.fx + 2, kit.fy + 8, 12, kit.fh - 16);
      ctx.fillRect(kit.fx + 16, kit.fy + 8, 12, kit.fh - 16);
      ctx.fillStyle = "#d8d4ca";
      ctx.fillRect(kit.fx + 13, kit.fy + 32, 4, 7);
      ctx.fillStyle = "#c9cdd2";
      ctx.fillRect(kit.fx + 3, kit.fy, 14, 4);
      ctx.fillRect(kit.fx + 6, kit.fy - 4, 9, 4);
      ctx.fillStyle = "#23262c";
      ctx.fillRect(kit.fx + 32, kit.fy + 48, 11, 11);   // kerosene ring
      ctx.fillStyle = "#8a8d92";
      ctx.fillRect(kit.fx + 34, kit.fy + 42, 7, 7);     // chai pot

      /* the bed — wooden, thin mattress, gingham sheet */
      ctx.fillStyle = "#7a4c26";
      ctx.fillRect(bed.fx - 3, bed.fy - 7, 5, 52);
      ctx.fillRect(bed.fx - 3, bed.fy - 7, bed.fw + 6, 5);
      ctx.fillStyle = "#8a5a2e";
      ctx.fillRect(bed.fx, bed.fy, bed.fw, 6);
      ctx.fillStyle = "#e8e0c0";
      ctx.fillRect(bed.fx, bed.fy + 5, bed.fw, 42);
      ctx.fillStyle = "rgba(200,170,60,0.55)";
      for (let gy2 = 0; gy2 < 6; gy2++) {
        for (let gx2 = 0; gx2 < 9; gx2++) {
          if ((gx2 + gy2) % 2 === 0) {
            ctx.fillRect(bed.fx + gx2 * 7.4, bed.fy + 5 + gy2 * 7, 7.4, 7);
          }
        }
      }
      ctx.fillStyle = "#c05a2e";
      ctx.fillRect(bed.fx + bed.fw - 18, bed.fy + 5, 18, 42);
      ctx.fillStyle = "#e8a020";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(bed.fx + bed.fw - 18, bed.fy + 8 + i * 10, 18, 3);
      }
      ctx.fillStyle = "#f0ece0";
      ctx.fillRect(bed.fx + 3, bed.fy + 7, 18, 10);
      ctx.fillStyle = "#6e4222";
      ctx.fillRect(bed.fx, bed.fy + 47, 4, 12);
      ctx.fillRect(bed.fx + bed.fw - 4, bed.fy + 47, 4, 12);
      ctx.fillStyle = "#8a7350";
      ctx.fillRect(bed.fx + 8, bed.fy + 49, 18, 10);
      ctx.fillStyle = "#7d8792";
      ctx.fillRect(bed.fx + 32, bed.fy + 51, 20, 8);
      const sick = (game.housemates || []).find((h) => h.status === "sick");
      if (sick) {
        ctx.fillStyle = "#c05a2e";
        ctx.fillRect(bed.fx + 18, bed.fy + 8, 34, 13);
        ctx.fillStyle = sick.skin;
        ctx.fillRect(bed.fx + 11, bed.fy + 10, 8, 8);
        ctx.fillStyle = "#181410";
        ctx.fillRect(bed.fx + 10, bed.fy + 8, 10, 4);
        const br = Math.sin(this.t * 3) * 0.7;
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(bed.fx + 18, bed.fy + 8 + br, 34, 2);
      }

      /* the one small window */
      ctx.save();
      ctx.beginPath();
      ctx.rect(win.fx + 3, win.fy + 3, win.fw - 6, win.fh - 6);
      ctx.clip();
      this.drawOutside({ fx: win.fx + 3, fy: win.fy + 3, fw: win.fw - 6, fh: win.fh - 6 }, game);
      ctx.restore();
      ctx.strokeStyle = "#7da4ac";
      ctx.lineWidth = 3;
      ctx.strokeRect(win.fx + 1.5, win.fy + 1.5, win.fw - 3, win.fh - 3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(win.fx + win.fw / 2, win.fy + 2); ctx.lineTo(win.fx + win.fw / 2, win.fy + win.fh - 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "#8a4a7a";
      ctx.fillRect(win.fx - 4, win.fy - 2, 6, win.fh + 4);

      /* the OLD CRT on its wall bracket (top-right) */
      ctx.fillStyle = "#4a3520";
      ctx.fillRect(tv.fx - 3, tv.fy + tv.fh, tv.fw + 6, 4);
      ctx.strokeStyle = "#3a2a18";
      ctx.beginPath();
      ctx.moveTo(tv.fx + 2, tv.fy + tv.fh + 4); ctx.lineTo(tv.fx + 9, tv.fy + tv.fh + 13);
      ctx.moveTo(tv.fx + tv.fw - 2, tv.fy + tv.fh + 4); ctx.lineTo(tv.fx + tv.fw - 9, tv.fy + tv.fh + 13);
      ctx.stroke();
      ctx.fillStyle = "#6e4a2e";
      ctx.fillRect(tv.fx, tv.fy, tv.fw, tv.fh);
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(tv.fx, tv.fy, tv.fw, 4);
      ctx.fillStyle = "#3a2a18";
      ctx.fillRect(tv.fx + tv.fw - 8, tv.fy + 5, 6, tv.fh - 10);
      ctx.fillStyle = "#c9a13b";
      ctx.beginPath(); ctx.arc(tv.fx + tv.fw - 5, tv.fy + 11, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tv.fx + tv.fw - 5, tv.fy + 19, 2, 0, Math.PI * 2); ctx.fill();

      /* the phone on its charger, on a little crate below the CRT */
      ctx.strokeStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(pho.fx + 16, pho.fy - 10);
      for (let i = 0; i < 4; i++) {
        ctx.quadraticCurveTo(pho.fx + 20, pho.fy - 7 + i * 4, pho.fx + 16, pho.fy - 4 + i * 4);
      }
      ctx.stroke();
      ctx.fillStyle = "#5e4a30";
      ctx.fillRect(pho.fx - 3, pho.fy + pho.fh, pho.fw + 6, 4);
      ctx.fillStyle = "#15171c";
      ctx.fillRect(pho.fx + 3, pho.fy + 4, pho.fw - 6, pho.fh - 8);

      /* the battered metal door */
      ctx.fillStyle = "#4e6a72";
      ctx.fillRect(door.fx, door.fy, door.fw, door.fh);
      ctx.strokeStyle = "#3a525a";
      for (let y = door.fy + 8; y < door.fy + door.fh; y += 13) {
        ctx.beginPath(); ctx.moveTo(door.fx + 2, y); ctx.lineTo(door.fx + door.fw - 2, y); ctx.stroke();
      }
      ctx.fillStyle = "#dcbd60";
      ctx.fillRect(door.fx + 2, door.fy + 58, 3, 6);
      ctx.fillStyle = "#2a2119";
      ctx.fillRect(door.fx + door.fw - 7, door.fy + 18, 3, 3);

      /* hanging clothes + tarp pile squeezed into corners */
      ctx.strokeStyle = "#1d4550";
      ctx.beginPath(); ctx.moveTo(L + 4, 34); ctx.lineTo(L + 34, 37); ctx.stroke();
      ctx.fillStyle = "#c9a13b";
      ctx.fillRect(L + 6, 37, 9, 12);
      ctx.fillStyle = "#c05a8a";
      ctx.fillRect(L + 18, 38, 9, 11);
      ctx.fillStyle = "#5e6a70";
      ctx.fillRect(L + 2, 214, 30, 26);
      ctx.fillStyle = "#4a565c";
      ctx.fillRect(L + 5, 208, 22, 9);

      /* one worn mat + the friends (the heart of the room) */
      ctx.fillStyle = "#6a7a52";
      ctx.fillRect(158, 176, 120, 50);
      ctx.strokeStyle = "#55643f";
      ctx.strokeRect(161.5, 179.5, 113, 43);
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      for (let x = 166; x < 274; x += 9) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, 179); ctx.lineTo(x + 0.5, 222); ctx.stroke();
      }
      const seats = [[168, 186], [200, 200], [232, 186], [254, 202]];
      const mates = (game.housemates || []).filter((h) => h.status === "well");
      for (let i = 0; i < mates.length && i < seats.length; i++) {
        const hm = mates[i];
        const [hx, hy] = seats[i];
        const bob = Math.sin(this.t * 1.6 + i * 1.7) * 0.8;
        ctx.fillStyle = "#3a3630";
        ctx.fillRect(hx - 2, hy + 12, 13, 5);
        ctx.fillStyle = hm.shirt;
        ctx.fillRect(hx, hy + bob, 9, 13);
        ctx.fillStyle = hm.skin;
        ctx.fillRect(hx + 2, hy - 6 + bob, 6, 6);
        ctx.fillStyle = "#181410";
        ctx.fillRect(hx + 1, hy - 8 + bob, 8, 3);
        if (i === 1) {
          ctx.fillStyle = "#c9cdd2";
          ctx.fillRect(hx + 9, hy + 5 + bob, 3, 4);
        }
      }
      // low chowki with steel tins
      ctx.fillStyle = "#6e4b2d";
      ctx.fillRect(290, 150, 30, 7);
      ctx.fillStyle = "#583a20";
      ctx.fillRect(292, 157, 3, 10); ctx.fillRect(314, 157, 3, 10);
      ctx.fillStyle = "#c9cdd2";
      ctx.fillRect(295, 144, 9, 6); ctx.fillRect(307, 146, 7, 4);
    },

    /* ------------------------------------------------------------
       Dynamic pieces over the static room.
       ------------------------------------------------------------ */
    drawObjects(game) {
      const ctx = this.ctx;
      const slum = this._theme(game).slum;
      const tvO = game.byId("tv"), pho = game.byId("computer"),
            kit = game.byId("kitchen"), win = game.byId("window"),
            door = game.byId("door");

      // the TV screen (bulging old glass on the slum CRT)
      const scr = slum
        ? { x: tvO.fx + 6, y: tvO.fy + 8, w: tvO.fw - 20, h: tvO.fh - 16 }
        : { x: tvO.fx + 10, y: tvO.fy + 6, w: tvO.fw - 22, h: tvO.fh - 30 };
      const tvOnNow = game.tvOn && this.world.flickerOn && !game.flags.powerOut;
      if (tvOnNow) {
        const base = game.phase >= 3 ? "#4a1a1e" : game.phase >= 2 ? "#3a4a3c" : "#155e66";
        ctx.fillStyle = base;
        ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
        ctx.fillStyle = game.phase >= 3 ? "rgba(220,90,80,0.35)" : "rgba(120,220,220,0.30)";
        ctx.fillRect(scr.x, scr.y + ((this.t * 26) % Math.max(4, scr.h - 4)), scr.w, 3);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(scr.x, scr.y, scr.w, Math.min(12, scr.h / 3));
        if (slum) { // the old set rolls and ghosts
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.fillRect(scr.x, scr.y + ((this.t * 60) % scr.h), scr.w, 5);
          ctx.fillStyle = "rgba(255,255,255,0.10)";
          ctx.fillRect(scr.x + 2, scr.y + scr.h - 5, 4, 3); // glass glare
        }
      } else {
        ctx.fillStyle = "#070809";
        ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
      }

      // monitor / phone screen glow
      if (!game.flags.powerOut && this.world.flickerOn) {
        const mon = slum
          ? { x: pho.fx + 5, y: pho.fy + 12, w: pho.fw - 10, h: pho.fh - 22 }
          : { x: pho.fx + 25, y: pho.fy + 5, w: 34, h: 22 };
        ctx.fillStyle = game.phase >= 3 ? "rgba(210,80,70,0.55)" : "rgba(90,200,140,0.5)";
        ctx.fillRect(mon.x, mon.y, mon.w, mon.h);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(mon.x, mon.y + ((this.t * 18) % Math.max(3, mon.h - 3)), mon.w, 2);
      }

      // chai / coffee ready-light + steam
      const lx = slum ? kit.fx + 46 : kit.fx + 8;
      const ly = slum ? kit.fy + 50 : kit.fy + 4;
      const on = Math.sin(this.t * 3) > -0.5 && !game.flags.powerOut;
      ctx.fillStyle = on ? "#e0a83c" : "#5a4416";
      ctx.fillRect(lx + 2, ly + 2, 3, 3);
      if (this.world.flickerOn && !game.flags.powerOut) {
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        for (let i = 0; i < 2; i++) {
          const sx = lx + 5 + i * 5 + Math.sin(this.t * 2 + i) * 1.5;
          ctx.fillRect(sx, ly - 4 - ((this.t * 6 + i * 3) % 7), 1, 2);
        }
      }
      if (game.fx.cooking > 0) {
        ctx.fillStyle = "rgba(255,120,60," + (0.5 + 0.4 * this.world.flame) + ")";
        ctx.beginPath();
        ctx.arc(slum ? kit.fx + 48 : kit.fx + 33, slum ? kit.fy + 64 : kit.fy + 16, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // barricades sit on the actual window/door rectangles
      this.drawBarricade({ fx: win.fx, fy: win.fy, fw: win.fw, fh: win.fh }, game.barricades.window);
      this.drawBarricade({ fx: door.fx, fy: door.fy, fw: door.fw, fh: door.fh }, game.barricades.door);

      if (game.doorKnocking) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 6));
        ctx.fillStyle = "rgba(210,70,60," + a + ")";
        ctx.font = "10px monospace";
        ctx.fillText("!", door.fx + 8, door.fy - 4);
      }

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

    /* ============================================================
       OUTSIDE THE GLASS — city / suburb / farm, each battered in
       its own way as the world decays.
       ============================================================ */
    drawOutside(o, game) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
      const seed = o.fx;
      const area = game.areaId || "city";

      // sky
      const day = 1 - w.dark;
      const sky = ctx.createLinearGradient(0, gy, 0, gy + gh);
      const top = this._mix([24, 30, 52], [122, 142, 168], day);
      const bot = this._mix([14, 16, 28], [214, 160, 118], day);
      const rt = w.redSky;
      sky.addColorStop(0, this._rgb(this._mix(top, [60, 20, 24], rt)));
      sky.addColorStop(1, this._rgb(this._mix(bot, [120, 40, 30], rt)));
      ctx.fillStyle = sky;
      ctx.fillRect(gx, gy, gw, gh);

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

      // scene ground line + scene itself
      const slum = game.zoneId === "slum";
      let base;
      if (slum) base = gy + gh * 0.6;
      else if (area === "rural") base = gy + gh * 0.55;
      else if (area === "suburb") base = gy + gh * 0.62;
      else base = gy + gh * 0.66;

      if (slum) this._outSlum(o, game, base, seed, day);
      else if (area === "rural") this._outRural(o, game, base, seed, day);
      else if (area === "suburb") this._outSuburb(o, game, base, seed, day);
      else this._outCity(o, game, base, seed, day);

      // fire glow on the horizon during catastrophe
      if (w.redSky > 0.05) {
        const fg = ctx.createLinearGradient(0, base - 6, 0, base + 8);
        fg.addColorStop(0, "rgba(255,120,40," + (0.55 * w.redSky * w.flame) + ")");
        fg.addColorStop(1, "rgba(120,20,10,0)");
        ctx.fillStyle = fg;
        ctx.fillRect(gx, base - 6, gw, 14);
      }

      // shared figures on the ground line
      this._outFigures(o, game, base);

      // THE MONSOON — the sky opens and the lane becomes a river
      if (slum && game.flags.monsoon) {
        const gx2 = o.fx, gy2 = o.fy, gw2 = o.fw, gh2 = o.fh;
        // flood water over the lower lane (drowns whatever was walking)
        const wl = base - 2;
        ctx.fillStyle = "rgba(58,84,96,0.65)";
        ctx.fillRect(gx2, wl, gw2, gy2 + gh2 - wl);
        ctx.strokeStyle = "rgba(180,210,220,0.25)";
        for (let i = 0; i < 3; i++) {
          const wy = wl + 3 + i * 4;
          ctx.beginPath();
          ctx.moveTo(gx2, wy + Math.sin(this.t * 2 + i) * 1.2);
          ctx.lineTo(gx2 + gw2, wy + Math.cos(this.t * 2 + i) * 1.2);
          ctx.stroke();
        }
        // washed-out walkers, face down in the flood, drifting
        for (let i = 0; i < 3; i++) {
          const fx2 = gx2 + ((this.t * 6 + i * 47) % (gw2 + 14)) - 7;
          ctx.fillStyle = "#4a5444";
          ctx.fillRect(fx2, wl + 4 + (i * 3) % 8, 8, 2);
          ctx.fillStyle = "#5e82a0";
          ctx.fillRect(fx2 + 3, wl + 3 + (i * 3) % 8, 2, 2); // fused plastic scrap
        }
        // the rain itself
        ctx.strokeStyle = "rgba(200,225,235,0.35)";
        for (let i = 0; i < 26; i++) {
          const rx = gx2 + ((i * 37 + this.t * 160) % gw2);
          const ry = gy2 + ((i * 53 + this.t * 340) % gh2);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 2, ry + 6);
          ctx.stroke();
        }
      }
    },

    /* ---- CITY: skyline, sealed street ---- */
    _outCity(o, game, base, seed, day) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
      const det = game.det || 0;

      ctx.fillStyle = this._rgb(this._mix([12, 14, 20], [52, 56, 66], day * 0.5));
      for (let i = 0; i < 5; i++) {
        const bx = gx + ((i * 37 + seed) % (gw + 20)) - 10;
        const bw = 12 + ((i * 13 + seed) % 14);
        const bh = 18 + ((i * 17 + seed) % 26);
        ctx.fillRect(bx, base - bh, bw, bh);
        if (Math.random() < 0.02 * day + 0.005) {
          ctx.fillStyle = "rgba(230,200,120,0.5)";
          ctx.fillRect(bx + 2, base - bh + 3, 2, 2);
          ctx.fillStyle = this._rgb(this._mix([12, 14, 20], [52, 56, 66], day * 0.5));
        }
      }

      // street
      ctx.fillStyle = "#161418";
      ctx.fillRect(gx, base, gw, gy + gh - base);
      ctx.strokeStyle = "rgba(200,200,120,0.15)";
      ctx.beginPath();
      ctx.moveTo(gx, base + (gy + gh - base) / 2);
      ctx.lineTo(gx + gw, base + (gy + gh - base) / 2);
      ctx.stroke();

      this._decayCommon(o, game, base, seed);
      if (det >= 2) {
        for (let i = 0; i < 5; i++) {
          const bx = gx + ((i * 37 + seed) % (gw + 20)) - 10;
          const bw2 = 12 + ((i * 13 + seed) % 14);
          const bh2 = 18 + ((i * 17 + seed) % 26);
          if ((i + seed) % 3 === 0) this._smoke(bx + bw2 / 2, base - bh2, gy);
          if (det >= 3 && (i + seed) % 4 === 1) {
            ctx.fillStyle = "rgba(255," + Math.floor(120 + 80 * w.flame) + ",40," + (0.5 + 0.4 * w.flame) + ")";
            ctx.fillRect(bx + 3, base - bh2 + 4, 3, 3);
          }
        }
      }
    },

    /* ---- SUBURB: a street of neighbor houses ---- */
    _outSuburb(o, game, base, seed, day) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
      const det = game.det || 0;

      // lawns
      const lawn = this._mix([26, 44, 26], [96, 74, 40], Math.min(1, det / 3));
      ctx.fillStyle = this._rgb(this._mix(lawn, [8, 12, 8], 1 - day * 0.8));
      ctx.fillRect(gx, base - 4, gw, 6);

      // two houses per pane
      for (let i = 0; i < 2; i++) {
        const hx = gx + 8 + i * (gw / 2) + ((seed * 3) % 6);
        const hw = gw / 2 - 20;
        const hh = 22;
        const burned = det >= 4 && (i + seed) % 3 === 0;
        const boarded = det >= 2 && (i + seed) % 2 === 0;
        // body
        ctx.fillStyle = burned ? "#1a1512" : ["#9a8a72", "#8a7a8a"][(i + seed) % 2];
        ctx.fillRect(hx, base - hh, hw, hh - 2);
        // roof
        ctx.fillStyle = burned ? "#141210" : "#5e3a32";
        ctx.beginPath();
        ctx.moveTo(hx - 4, base - hh);
        ctx.lineTo(hx + hw / 2, base - hh - 10);
        ctx.lineTo(hx + hw + 4, base - hh);
        ctx.closePath(); ctx.fill();
        // chimney
        ctx.fillStyle = burned ? "#1a1512" : "#6e4a3a";
        ctx.fillRect(hx + hw - 8, base - hh - 8, 4, 8);
        // door + windows
        ctx.fillStyle = "#3a2c20";
        ctx.fillRect(hx + hw / 2 - 3, base - 10, 6, 8);
        for (const wx of [hx + 4, hx + hw - 10]) {
          ctx.fillStyle = burned ? "#0a0908"
            : (day > 0.5 || Math.random() < 0.3) && det < 3 ? "#59728a" : "#131720";
          ctx.fillRect(wx, base - hh + 5, 6, 5);
          if (boarded) {
            ctx.strokeStyle = "#7a5a38";
            ctx.beginPath();
            ctx.moveTo(wx - 1, base - hh + 4); ctx.lineTo(wx + 7, base - hh + 11);
            ctx.moveTo(wx + 7, base - hh + 4); ctx.lineTo(wx - 1, base - hh + 11);
            ctx.stroke();
          }
        }
        if (det >= 3 && (i + seed) % 2 === 1) {
          // house fire
          ctx.fillStyle = "rgba(255," + Math.floor(110 + 90 * w.flame) + ",40," + (0.5 + 0.4 * w.flame) + ")";
          ctx.fillRect(hx + 4, base - hh + 3, 7, 6);
          this._smoke(hx + 7, base - hh - 8, gy);
        }
        if (burned) this._smoke(hx + hw / 2, base - hh - 4, gy);
      }

      // picket fence
      ctx.fillStyle = det >= 3 ? "#4a4238" : "#c9c2b0";
      for (let fx2 = gx + 2; fx2 < gx + gw; fx2 += 7) {
        if (det >= 2 && ((fx2 + seed) % 23) < 5) continue; // broken slats
        ctx.fillRect(fx2, base - 1, 2, 5);
      }
      // mailbox (tipped over late)
      ctx.fillStyle = "#3a4a5a";
      if (det < 3) {
        ctx.fillRect(gx + gw - 12, base - 6, 6, 4);
        ctx.fillStyle = "#5a4a3a";
        ctx.fillRect(gx + gw - 10, base - 2, 2, 6);
      } else {
        ctx.fillRect(gx + gw - 14, base + 3, 8, 3);
      }

      // street
      ctx.fillStyle = "#1a181c";
      ctx.fillRect(gx, base + 4, gw, gy + gh - base - 4);
      this._decayCommon(o, game, base + 4, seed);
    },

    /* ---- RURAL: fields, barn, windmill ---- */
    _outRural(o, game, base, seed, day) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
      const det = game.det || 0;

      // fields to the horizon (green -> dead gold -> ash)
      const healthy = [58, 92, 44], dead = [122, 100, 52], ash = [58, 52, 44];
      let fieldCol = this._mix(healthy, dead, Math.min(1, det / 2.5));
      if (det >= 3.5) fieldCol = this._mix(fieldCol, ash, (det - 3.5) * 2);
      const field = ctx.createLinearGradient(0, base - 14, 0, gy + gh);
      field.addColorStop(0, this._rgb(this._mix(fieldCol, [10, 14, 10], 1 - day * 0.85)));
      field.addColorStop(1, this._rgb(this._mix(
        this._mix(fieldCol, [30, 24, 12], 0.4), [8, 10, 8], 1 - day * 0.85)));
      ctx.fillStyle = field;
      ctx.fillRect(gx, base - 14, gw, gy + gh - base + 14);

      // crop rows
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const yy = base - 8 + i * ((gy + gh - base + 8) / 6);
        ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke();
      }

      if (seed < 250) {
        // the barn (left pane)
        const bx = gx + 12, bw2 = 34, bh2 = 24;
        const burned = det >= 3;
        ctx.fillStyle = burned ? "#2a1512" : "#8a3a30";
        ctx.fillRect(bx, base - bh2, bw2, bh2 - 2);
        ctx.fillStyle = burned ? "#181210" : "#5e2620";
        ctx.beginPath();
        ctx.moveTo(bx - 3, base - bh2);
        ctx.lineTo(bx + bw2 / 2, base - bh2 - 9);
        ctx.lineTo(bx + bw2 + 3, base - bh2);
        ctx.closePath(); ctx.fill();
        // white X door
        ctx.strokeStyle = burned ? "#3a3a3a" : "#e8e0d0";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx + bw2 / 2 - 6, base - 13, 12, 11);
        ctx.beginPath();
        ctx.moveTo(bx + bw2 / 2 - 6, base - 13); ctx.lineTo(bx + bw2 / 2 + 6, base - 2);
        ctx.moveTo(bx + bw2 / 2 + 6, base - 13); ctx.lineTo(bx + bw2 / 2 - 6, base - 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        if (burned) {
          ctx.fillStyle = "rgba(255," + Math.floor(110 + 90 * w.flame) + ",40," + (0.5 + 0.4 * w.flame) + ")";
          ctx.fillRect(bx + 4, base - bh2 + 4, 8, 7);
          this._smoke(bx + bw2 / 2, base - bh2 - 6, gy);
        }
        // hay bales
        ctx.fillStyle = det >= 2 ? "#6e5a30" : "#b99a4a";
        ctx.fillRect(bx + bw2 + 8, base - 6, 9, 6);
        ctx.fillRect(bx + bw2 + 20, base - 5, 8, 5);
      } else {
        // the windmill (right pane) — blades keep turning
        const mx = gx + gw - 26, mh = 30;
        ctx.strokeStyle = "#5a5248";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx - 6, base); ctx.lineTo(mx, base - mh);
        ctx.moveTo(mx + 6, base); ctx.lineTo(mx, base - mh);
        ctx.stroke();
        ctx.lineWidth = 1;
        const spin = det >= 3 ? this.t * 0.4 : this.t * 1.6; // slows as the world dies
        for (let b = 0; b < 4; b++) {
          const ang = spin + (b * Math.PI) / 2;
          ctx.strokeStyle = "#8a8276";
          ctx.beginPath();
          ctx.moveTo(mx, base - mh);
          ctx.lineTo(mx + Math.cos(ang) * 11, base - mh + Math.sin(ang) * 11);
          ctx.stroke();
        }
        // abandoned tractor late
        if (det >= 2) {
          ctx.fillStyle = "#4a3f2e";
          ctx.fillRect(gx + 14, base - 5, 16, 5);
          ctx.fillStyle = "#2e2820";
          ctx.beginPath(); ctx.arc(gx + 18, base + 1, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(gx + 27, base + 1, 4, 0, Math.PI * 2); ctx.fill();
        }
      }

      // fence posts along the dirt road
      ctx.fillStyle = "#4e4234";
      for (let fx2 = gx + 4; fx2 < gx + gw; fx2 += 14) {
        const lean = det >= 2 && ((fx2 + seed) % 3 === 0) ? 2 : 0;
        ctx.fillRect(fx2 + lean, base + 4, 2, 6);
      }
      ctx.strokeStyle = "rgba(78,66,52,0.8)";
      ctx.beginPath(); ctx.moveTo(gx, base + 6); ctx.lineTo(gx + gw, base + 6); ctx.stroke();

      // crows over dead fields
      if (det >= 2 && this.world.dark < 0.5) {
        ctx.fillStyle = "#14120e";
        for (let i = 0; i < 3; i++) {
          const cxx = gx + ((this.t * 9 + i * 30 + seed) % (gw + 20)) - 10;
          const cy = gy + 12 + i * 6 + Math.sin(this.t * 3 + i) * 2;
          ctx.fillRect(cxx, cy, 3, 1);
          ctx.fillRect(cxx + 1, cy - 1, 1, 1);
        }
      }
      if (det >= 4) {
        ctx.fillStyle = "#1c1a18";
        const rx = gx + ((seed * 11) % Math.max(6, gw - 14));
        ctx.fillRect(rx, base + 8, 10, 3);
        ctx.fillRect(rx + 2, base + 6, 6, 2);
      }
    },

    /* ---- SLUM LANE: corrugated shacks, tarps, heaps — and the river ---- */
    _outSlum(o, game, base, seed, day) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
      const det = game.det || 0;

      // hazy far towers
      ctx.fillStyle = this._rgb(this._mix([16, 18, 24], [70, 74, 84], day * 0.35));
      for (let i = 0; i < 3; i++) {
        const bx = gx + ((i * 53 + seed) % (gw + 10)) - 5;
        ctx.fillRect(bx, base - 34 - (i * 7 + seed) % 10, 9, 30);
      }

      // back row of shacks (darker)
      const backCols = ["#5e3a30", "#3a4a5e", "#5e5030"];
      for (let i = 0; i < 4; i++) {
        const bx = gx + i * (gw / 4) + ((seed * 3) % 5) - 2;
        const bw2 = gw / 4 - 2;
        ctx.fillStyle = backCols[(i + seed) % 3];
        ctx.fillRect(bx, base - 26, bw2, 18);
        ctx.fillStyle = "#4a4d52";
        ctx.fillRect(bx - 1, base - 29, bw2 + 2, 4);       // tin roof
      }

      // front row: the bright shack fronts (red/orange/blue, like the photo)
      const cols = ["#b04a34", "#c9762e", "#3a7a9a", "#a03a3a", "#3aa0a0"];
      for (let i = 0; i < 3; i++) {
        const bx = gx + 2 + i * (gw / 3);
        const bw2 = gw / 3 - 5;
        const burned = det >= 3.5 && (i + seed) % 4 === 0;
        ctx.fillStyle = burned ? "#241a14" : cols[(i + seed) % 5];
        ctx.fillRect(bx, base - 18, bw2, 16);
        // corrugation lines
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        for (let vx = bx + 2; vx < bx + bw2; vx += 4) {
          ctx.beginPath(); ctx.moveTo(vx + 0.5, base - 18); ctx.lineTo(vx + 0.5, base - 2); ctx.stroke();
        }
        // tin roof + blue tarp
        ctx.fillStyle = "#63666b";
        ctx.fillRect(bx - 2, base - 21, bw2 + 4, 4);
        if ((i + seed) % 2 === 0) {
          ctx.fillStyle = det >= 3 ? "#2a4a66" : "#2e6aa0";
          ctx.fillRect(bx + 2, base - 23, bw2 - 6, 3);
        }
        // doorway + window
        ctx.fillStyle = "#1a1410";
        ctx.fillRect(bx + 3, base - 12, 5, 10);
        ctx.fillStyle = det >= 2 ? "#131720" : "#7a94a8";
        ctx.fillRect(bx + bw2 - 9, base - 14, 6, 5);
        if (det >= 3 && (i + seed) % 3 === 1) {
          ctx.fillStyle = "rgba(255," + Math.floor(110 + 90 * w.flame) + ",40," + (0.5 + 0.4 * w.flame) + ")";
          ctx.fillRect(bx + 3, base - 16, 6, 6);
          this._smoke(bx + 6, base - 23, gy);
        }
      }

      // tangled power lines across the lane
      ctx.strokeStyle = "rgba(20,18,16,0.7)";
      ctx.beginPath();
      ctx.moveTo(gx, gy + 14 + (seed % 5));
      ctx.quadraticCurveTo(gx + gw / 2, gy + 22 + (seed % 7), gx + gw, gy + 12 + (seed % 4));
      ctx.moveTo(gx, gy + 18 + (seed % 4));
      ctx.quadraticCurveTo(gx + gw / 2, gy + 27, gx + gw, gy + 17);
      ctx.stroke();

      // the lane itself
      ctx.fillStyle = "#6a5a44";
      ctx.fillRect(gx, base, gw, gy + gh - base);

      // lane life: people early, empty later
      if (det < 2.5 && w.dark < 0.6) {
        const n = det < 1 ? 4 : 2;
        for (let i = 0; i < n; i++) {
          const px2 = gx + ((this.t * (6 + i * 2) + i * 37 + seed) % gw);
          const py2 = base + 4 + (i * 7) % Math.max(3, gy + gh - base - 8);
          ctx.fillStyle = ["#c05a3a", "#3a7ac0", "#c9a13b", "#3aa06a"][i % 4];
          ctx.fillRect(px2, py2 - 5, 3, 5);
          ctx.fillStyle = "#8a5a34";
          ctx.fillRect(px2, py2 - 8, 3, 3);
        }
      }

      // trash heaps — and what lives in them
      for (const hx of [gx + 8 + (seed % 10), gx + gw - 26]) {
        ctx.fillStyle = "#4a4438";
        ctx.fillRect(hx, base + 2, 18, 6);
        ctx.fillRect(hx + 3, base - 1, 12, 4);
        ctx.fillStyle = "#5e82a0";                          // blue bags
        ctx.fillRect(hx + 2, base + 1, 4, 3);
        ctx.fillStyle = "#c9c2b0";                          // white bags
        ctx.fillRect(hx + 10, base, 4, 3);
        ctx.fillStyle = "#7a8a4a";
        ctx.fillRect(hx + 14, base + 3, 3, 2);
        // det>=3: the heap breathes
        if (det >= 3 && Math.sin(this.t * 0.9 + hx) > 0.93) {
          ctx.fillStyle = "#3a4436";
          ctx.fillRect(hx + 6, base - 4, 5, 4);            // something rising
        }
      }

      if (seed < 250) {
        // LEFT pane: the railway line (like the photo)
        const ry = gy + gh - 7;
        ctx.fillStyle = "#3a342c";
        for (let sx2 = gx; sx2 < gx + gw; sx2 += 6) {
          ctx.fillRect(sx2, ry, 4, 2);                      // sleepers
        }
        ctx.strokeStyle = "#8a8d92";
        ctx.beginPath();
        ctx.moveTo(gx, ry); ctx.lineTo(gx + gw, ry);
        ctx.moveTo(gx, ry + 3); ctx.lineTo(gx + gw, ry + 3);
        ctx.stroke();
      } else {
        // RIGHT pane: the Mithi river — where the infected go to die
        const ry = gy + gh - 12;
        ctx.fillStyle = "#33463a";
        ctx.fillRect(gx, ry, gw, 12);
        ctx.strokeStyle = "rgba(140,170,150,0.2)";
        for (let i = 0; i < 3; i++) {
          const wy = ry + 3 + i * 3;
          ctx.beginPath();
          ctx.moveTo(gx, wy + Math.sin(this.t + i) * 1);
          ctx.lineTo(gx + gw, wy + Math.cos(this.t + i) * 1);
          ctx.stroke();
        }
        // the floaters (det>=2): pale shapes drifting with the current
        if (det >= 2) {
          const n = det >= 3.5 ? 4 : det >= 3 ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const fx2 = gx + ((this.t * 4 + i * 43 + seed) % (gw + 16)) - 8;
            const fy2 = ry + 3 + (i * 3) % 7;
            ctx.fillStyle = "#8a9284";
            ctx.fillRect(fx2, fy2, 7, 2);                  // a body, face down
            ctx.fillStyle = "#6e7668";
            ctx.fillRect(fx2 + 5, fy2 - 1, 2, 2);          // the head
          }
        }
      }

      this._decayCommon(o, game, base, seed);
    },

    /* shared street decay bits (trash, paper, abandoned car, rubble) */
    _decayCommon(o, game, base, seed) {
      const ctx = this.ctx;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;
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
      if (det >= 2 && game.areaId !== "rural") {
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
      }
      if (det >= 4) {
        ctx.fillStyle = "#1c1a18";
        const rx = gx + ((seed * 11) % Math.max(6, gw - 14));
        ctx.fillRect(rx, base - 2, 10, 3);
        ctx.fillRect(rx + 2, base - 4, 6, 2);
      }
    },

    _smoke(x, topY, clipTop) {
      const ctx = this.ctx;
      for (let s = 0; s < 6; s++) {
        const rise = (this.t * 8 + s * 5) % 30;
        const sx = x + Math.sin((this.t + s) * 1.3) * (2 + rise * 0.15);
        const sy = topY - rise;
        if (sy < clipTop) continue;
        ctx.fillStyle = "rgba(90,90,95," + (0.35 * (1 - rise / 30)) + ")";
        ctx.fillRect(sx, sy, 2, 2);
      }
    },

    /* shamblers, soldiers, helicopter — shared across scenes */
    _outFigures(o, game, base) {
      const ctx = this.ctx;
      const w = this.world;
      const gx = o.fx, gy = o.fy, gw = o.fw, gh = o.fh;

      const trashy = game.zoneId === "slum";
      for (const z of w.shamblers) {
        if (z.x < gx - 20 || z.x > gx + gw + 20) continue;
        const zx = z.x, zy = base + 2;
        const tw2 = Math.sin(z.t * 7) * 0.8;
        if (trashy) {
          // a kachra walker: refuse fused to the body
          ctx.fillStyle = "#4a4438";
          ctx.fillRect(zx - 3 + tw2, zy - 10, 7, 10);
          ctx.fillStyle = "#5e82a0";                        // plastic scraps
          ctx.fillRect(zx - 2 + tw2, zy - 8, 2, 2);
          ctx.fillStyle = "#c9c2b0";                        // rag
          ctx.fillRect(zx + 1 + tw2, zy - 5, 2, 3);
          ctx.fillStyle = "#3a4436";
          ctx.fillRect(zx - 1 + tw2, zy - 13, 4, 3);        // head under debris
          if (Math.sin(z.t * 5) > 0.6) {                    // flies
            ctx.fillStyle = "rgba(20,20,16,0.8)";
            ctx.fillRect(zx + 3 + tw2, zy - 14, 1, 1);
          }
        } else {
          ctx.fillStyle = "#4e5c46";
          ctx.fillRect(zx - 2 + tw2, zy - 10, 5, 10);
          ctx.fillStyle = "#6a785c";
          ctx.fillRect(zx - 1 + tw2, zy - 13, 3, 3);
        }
      }

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

    /* ---------- player (4-frame walk cycle) ---------- */
    drawPlayer(game) {
      const ctx = this.ctx;
      const p = game.player;
      // the player wears the region: slum runs get the lane's own look
      const spr = this._spr(game.zoneId === "slum" ? "player_slum" : "player")
        || this._spr("player");
      const bob = p.moving ? Math.abs(Math.sin(p.animTime * 8)) * 1 : 0;
      const trem = p.stress > 70 ? (Math.random() - 0.5) * (p.stress - 70) / 30 : 0;
      const px = Math.round(p.x - p.w / 2 + trem);
      const py = Math.round(p.y - p.h / 2 - bob);

      if (spr) {
        const frames = spr.width >= 300 ? 4 : 1;
        const fw = spr.width / frames;
        const frame = (p.moving && frames === 4) ? p.frame % 4 : 0;
        ctx.save();
        if (p.dir < 0) {
          ctx.translate(px + p.w, py); ctx.scale(-1, 1);
          ctx.drawImage(spr, frame * fw, 0, fw, spr.height, 0, 0, p.w, p.h);
        } else {
          ctx.drawImage(spr, frame * fw, 0, fw, spr.height, px, py, p.w, p.h);
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
      const boost = Math.min(1, (game.fx.coffee || 0) / 10);
      dark *= (1 - 0.3 * boost);
      if (dark <= 0.02) return;

      ctx.save();
      ctx.fillStyle = "rgba(4,5,10," + dark + ")";
      ctx.fillRect(0, 0, this.W, this.H);

      ctx.globalCompositeOperation = "destination-out";
      const p = game.player;
      this._lightPool(p.x, p.y, 110, 0.7 * (w.flickerOn ? 1 : 0.4));

      const powered = !game.flags.powerOut && w.flickerOn;
      const T2 = this._theme(game);
      const tvO = game.byId("tv"), pho = game.byId("computer");
      if (game.tvOn && powered) {
        this._lightPool(tvO.fx + tvO.fw / 2, tvO.fy + tvO.fh / 2, T2.slum ? 40 : 52, 0.6);
      }
      if (powered) this._lightPool(pho.fx + pho.fw / 2, pho.fy + pho.fh / 2, T2.slum ? 24 : 36, 0.5);
      if (powered) {
        if (T2.slum) this._lightPool(240, 34, 60, 0.6);          // the bare bulb
        else this._lightPool(449, 38, 55, 0.55);
      }
      // the farmhouse stove glows even when the grid dies
      if (T2.stove) this._lightPool(439, 52, 30, 0.4);
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
       First-person window view: the whole outside scene, rendered
       big on the lookout canvas, framed by the window itself.
       ------------------------------------------------------------ */
    drawLookout(lctx, W, H, game) {
      const old = this.ctx;
      this.ctx = lctx;
      lctx.imageSmoothingEnabled = false;
      try {
        this.drawOutside({ fx: 0, fy: 0, fw: W, fh: H }, game);
      } finally {
        this.ctx = old;
      }
      // the window frame you're pressed against
      const T = this._theme(game);
      lctx.strokeStyle = T.slum ? "#7da4ac" : (T.winFrame || "#17171b");
      lctx.lineWidth = 10;
      lctx.strokeRect(5, 5, W - 10, H - 10);
      lctx.lineWidth = 5;
      lctx.beginPath();
      lctx.moveTo(W / 2, 5); lctx.lineTo(W / 2, H - 5);
      lctx.moveTo(5, H / 2); lctx.lineTo(W - 5, H / 2);
      lctx.stroke();
      lctx.lineWidth = 1;
      // your breath fogs the glass at the bottom
      const fog = lctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * 0.5);
      fog.addColorStop(0, "rgba(200,215,220,0.20)");
      fog.addColorStop(1, "rgba(200,215,220,0)");
      lctx.fillStyle = fog;
      lctx.fillRect(0, H * 0.6, W, H * 0.4);
      // glass vignette
      const vg = lctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      lctx.fillStyle = vg;
      lctx.fillRect(0, 0, W, H);
    },

    /* ------------------------------------------------------------
       Peephole render (door modal + free look).
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
        case "empty": {
          // nothing there… a moth crosses the porch light
          const mx = cx + Math.sin(Renderer.t * 2.2) * 40;
          const my = 70 + Math.cos(Renderer.t * 3.1) * 18;
          pctx.fillStyle = "rgba(220,215,190,0.7)";
          pctx.fillRect(mx, my, 2, 2);
          break;
        }
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
          const skin = "#d8b088";
          const clothes = visitor.color || "#3a5a7a";
          const bodyH = 66;
          pctx.fillStyle = clothes;
          pctx.fillRect(cx - 14, 122 - bodyH, 28, bodyH);
          pctx.fillStyle = skin;
          pctx.beginPath(); pctx.arc(cx, 122 - bodyH - 8, 13, 0, Math.PI * 2); pctx.fill();
          pctx.fillStyle = "#2a1c14";
          pctx.fillRect(cx - 13, 122 - bodyH - 18, 26, 8);
          pctx.fillStyle = "#1a1a1a";
          pctx.fillRect(cx - 5, 122 - bodyH - 9, 3, 2);
          pctx.fillRect(cx + 3, 122 - bodyH - 9, 3, 2);
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
