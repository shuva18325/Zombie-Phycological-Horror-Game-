/* ============================================================
   engine.js — game controller
   Owns the game state, input, all schedulers (phase escalation,
   door knocks, random horror, finale breach checks), the ending
   logic and the main animation loop. Wires the DOM and boots the
   whole thing once the sprites have loaded.
   Exposes: window.ZH.Engine
   ============================================================ */
(function (ZH) {
  "use strict";

  const DURATION = 300;               // seconds of story (dusk -> dawn)
  const DOOR_TIME = 9;                // seconds to answer a knock
  const TV_HOLDS = [12, 9, 8, 7, 6];  // seconds a broadcast holds, by phase

  // Interaction / draw layout. Single source of truth for object placement.
  function buildObjects() {
    // Six fixtures across the back wall. fx/fy/fw/fh = draw rect,
    // ix/iy/iw/ih = floor interaction zone in front of the fixture.
    const defs = [
      { id: "window-l", kind: "window", cx: 57 },
      { id: "tv",       kind: "tv",     cx: 130 },
      { id: "computer", kind: "computer", cx: 203 },
      { id: "window-r", kind: "window", cx: 277 },
      { id: "coffee",   kind: "coffee", cx: 350 },
      { id: "door",     kind: "door",   cx: 423 },
    ];
    return defs.map((d) => {
      const fw = 52, fh = 50;
      const fx = d.cx - fw / 2, fy = 18;
      return {
        id: d.id, kind: d.kind,
        fx, fy, fw, fh,
        ix: d.cx - 34, iy: 74, iw: 68, ih: 44,
      };
    });
  }

  const Engine = {
    game: null,
    input: { left: false, right: false, up: false, down: false },
    raf: 0,
    last: 0,
    running: false,

    /* ------------------------------------------------------------ */
    init() {
      const canvas = document.getElementById("game-canvas");
      ZH.Renderer.init(canvas);
      ZH.UI.init();
      ZH.Audio.preload();

      this.wireDom();
      // draw the (dark) room behind the menu for atmosphere
      ZH.Renderer.load(() => {
        this.newGame();
        this.loop(performance.now());
      });
    },

    newGame() {
      const player = new ZH.Player();
      this.game = {
        player,
        objects: buildObjects(),
        phase: 0,
        orderIndex: 0,
        timeElapsed: 0,
        duration: DURATION,
        running: false,
        modal: "none",           // none | tv | computer | phone | door
        active: null,            // object currently in reach
        tvOn: true,
        tvStage: 0,           // latest broadcast segment aired
        tvView: 0,            // segment currently on screen (history nav)
        nextTvAt: TV_HOLDS[0],
        computerAlerts: [],
        phoneMsgs: [],
        barricades: { door: 0, window: 0 },
        flags: {
          night: false, powerFlicker: false, powerOut: false,
          helicopter: false, soldiersOutside: false,
          ally: false, marked: false, missedEvac: false,
        },
        fx: { shake: 0, flash: 0, redFlash: 0 },
        firedOnce: {},
        stats: { doorsAnswered: 0, doorsOpened: 0, barricadesBuilt: 0, coffee: 0 },
        // schedulers
        nextHorrorAt: 14,
        nextKnockAt: 20,
        nextBreachCheck: 6,
        knockPending: null,
        knockDelay: 0,
        currentVisitor: null,
        doorKnocking: false,
        doorTimer: 0,
        gameOver: false,
        audio: ZH.Audio,
        // ---- helper methods bound to the state object ----
        byId(id) { return this.objects.find((o) => o.id === id); },
        anyScreenOpen() { return this.modal !== "none"; },
        clockString() {
          const prog = Math.min(1, this.timeElapsed / this.duration);
          let total = Math.floor(20 * 60 + prog * 10 * 60) % (24 * 60);
          const h = Math.floor(total / 60), m = total % 60;
          return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
        },
        toast(msg) { ZH.UI.toast(msg); },
        shake(n) { this.fx.shake = Math.max(this.fx.shake, n); },
        damageBarricade(which, n) {
          this.barricades[which] = Math.max(0, this.barricades[which] - n);
        },
      };
      ZH.UI.setMuteIcon(ZH.Audio.muted);
      this.unlockPhase(0, true);
    },

    startGame() {
      ZH.Audio.init();
      ZH.Audio.resume();
      ZH.Audio.startAmbience();
      ZH.UI.clearToasts();
      ZH.UI.hideMenu();
      ZH.UI.hideEnding();
      ZH.UI.showHUD();
      this.game.running = true;
    },

    /* ------------------------------------------------------------
       Phase escalation
       ------------------------------------------------------------ */
    unlockPhase(n, silent) {
      const g = this.game;
      g.phase = n;
      g.orderIndex = n;
      g.flags.night = n >= 1;

      // append this phase's government alerts
      (ZH.Content.GOV_ALERTS[n] || []).forEach((a) => g.computerAlerts.push(a));
      // append this phase's phone messages
      (ZH.Content.PHONE_MSGS[n] || []).forEach((m) => g.phoneMsgs.push(m));

      if (!silent) {
        ZH.Audio.alert();
        const banners = [
          "",
          "The news has changed its tone. A curfew is announced.",
          "SHELTER-IN-PLACE. Barricade everything. Stay away from the windows.",
          "MARTIAL LAW. The soldiers own the street now.",
          "CONTAINMENT DIRECTIVE. Your grid is outside the wall — the sweep comes at dawn.",
        ];
        if (banners[n]) g.toast("⚠ " + banners[n]);
        g.player.addStress(n * 3);
        ZH.Renderer.world.dark = Math.max(ZH.Renderer.world.dark, n >= 1 ? 0.4 : 0);
      }
    },

    /* ------------------------------------------------------------
       Interactions
       ------------------------------------------------------------ */
    interact() {
      const g = this.game;
      if (g.modal !== "none") return;
      const o = g.active;
      if (!o) return;
      switch (o.kind) {
        case "tv": this.openScreen("tv"); break;
        case "computer": this.openScreen("computer"); break;
        case "window": this.lookOutside(); break;
        case "coffee": this.drinkCoffee(); break;
        case "door": this.checkDoor(); break;
      }
    },

    openScreen(kind) {
      const g = this.game;
      g.modal = kind;
      ZH.Audio.blip();
      if (kind === "tv") { g.tvView = g.tvStage; ZH.UI.openTV(g); ZH.Audio.startTvStatic(); }
      if (kind === "computer") ZH.UI.openComputer(g);
      if (kind === "phone") ZH.UI.openPhone(g);
      ZH.UI.hidePrompt();
    },

    closeScreen() {
      const g = this.game;
      if (g.modal === "tv") { ZH.UI.closeTV(); ZH.Audio.stopTvStatic(); }
      if (g.modal === "computer") ZH.UI.closeComputer();
      if (g.modal === "phone") ZH.UI.closePhone();
      if (g.modal === "door") return; // door demands a choice
      g.modal = "none";
    },

    lookOutside() {
      const g = this.game;
      const lines = [
        { t: "The street is quiet. A neighbor's porch light hums. Everything looks perfectly normal.", s: -2 },
        { t: "A police cruiser idles at the corner with its lights off. Someone hurries past, glancing back over their shoulder.", s: +3 },
        { t: "Two houses down, a window is shattered. A dark shape drags itself across the lawn and goes still. You step back from the glass.", s: +7 },
        { t: "Fires smear the skyline orange. Soldiers move door to door in the street below. You should not be standing at this window.", s: +8 },
        { t: "You lift the very edge of the curtain. What is out there, under the helicopter light, you will not describe — not even to yourself.", s: +10 },
      ];
      const l = lines[g.phase];
      g.toast(l.t);
      g.player.addStress(l.s);
      if (g.phase >= 3) { g.flags.helicopter = g.flags.helicopter || Math.random() < 0.5; }
    },

    drinkCoffee() {
      const g = this.game, p = g.player;
      if (p.coffeeCooldown > 0) {
        g.toast("The pot needs a minute to brew again.");
        return;
      }
      ZH.Audio.coffee();
      p.coffeeCooldown = 8;
      g.stats.coffee++;
      if (p.fatigue < 20) {
        // over-caffeinated — jittery, wired
        p.addStress(7);
        p.addFatigue(-10);
        g.toast("You really didn't need this one. Your hands won't stop shaking.");
      } else {
        p.addFatigue(-38);
        p.addStress(-5);
        g.toast("Hot, bitter, grounding. The fog lifts a little. You can keep watch.");
      }
    },

    checkDoor() {
      const g = this.game;
      if (g.doorKnocking && g.knockPending) {
        // open the decision now
        this.openDoorModal();
        return;
      }
      g.toast("The door is locked, bolted, and chained. For now, it holds.");
    },

    barricade() {
      const g = this.game;
      if (g.modal !== "none") return;
      const o = g.active;
      if (!o || (o.kind !== "door" && o.kind !== "window")) return;
      const which = o.kind === "door" ? "door" : "window";
      if (g.barricades[which] >= 3) {
        g.toast("That " + which + " is barricaded as much as it can be.");
        return;
      }
      g.barricades[which]++;
      g.stats.barricadesBuilt++;
      g.player.addFatigue(6);
      g.player.addStress(-3);
      ZH.Audio.thud();
      g.toast("You wrench another plank across the " + which + ". A little safer. A little more trapped.");
    },

    /* ------------------------------------------------------------
       Door knock flow
       ------------------------------------------------------------ */
    triggerKnock() {
      const g = this.game;
      g.knockPending = ZH.Events.makeVisitor(g);
      g.knockDelay = 0.9;
      g.doorKnocking = true;
      ZH.Audio.knock();
      g.shake(1.5);
      g.toast("Knock. Knock. Knock. Someone — or something — is at the door.");
    },

    openDoorModal() {
      const g = this.game;
      g.currentVisitor = g.knockPending;
      g.modal = "door";
      g.doorTimer = DOOR_TIME;
      ZH.UI.hidePrompt();
      ZH.UI.openDoor(g, g.currentVisitor);
    },

    resolveDoor(choice) {
      const g = this.game;
      if (g.modal !== "door" || !g.currentVisitor) return;
      const res = g.currentVisitor.resolve(choice, g);
      g.stats.doorsAnswered++;
      if (choice === "yes") g.stats.doorsOpened++;
      g.player.addStress(res.stress || 0);
      if (res.flags) Object.assign(g.flags, res.flags);

      ZH.UI.closeDoor();
      g.modal = "none";
      g.doorKnocking = false;
      g.knockPending = null;
      const visitor = g.currentVisitor;
      g.currentVisitor = null;

      if (res.message) g.toast(res.message);

      if (res.ending) {
        if (choice === "yes" && visitor.sprite === "infected") ZH.Audio.scream();
        if (visitor.sprite === "soldier") ZH.Audio.thud();
        g.player.addStress(30);
        g.fx.redFlash = 0.5;
        this.queueEnding(res.ending, 1900);
      }
    },

    // Freeze gameplay for a dramatic beat, then show the ending.
    queueEnding(id, delay) {
      const g = this.game;
      g.running = false; // stop schedulers so nothing stacks over the finale
      setTimeout(() => this.triggerEnding(id), delay);
    },

    /* ------------------------------------------------------------
       Endings
       ------------------------------------------------------------ */
    triggerEnding(id) {
      const g = this.game;
      if (g.gameOver) return;
      g.gameOver = true;
      g.running = false;
      ZH.Audio.stopTvStatic();
      ZH.Audio.siren(false);
      ZH.Audio.setTension(0);
      if (ZH.Content.ENDINGS[id].mood === "good") {
        ZH.Audio.stopAmbience();
        ZH.Audio.powerUp();
      }
      ZH.UI.showEnding(g, id);
    },

    /* ------------------------------------------------------------
       Main loop
       ------------------------------------------------------------ */
    loop(now) {
      this.raf = requestAnimationFrame((t) => this.loop(t));
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      dt = Math.min(dt, 0.05); // clamp to avoid huge steps after tab-away

      const g = this.game;
      if (!g) return;

      // fx decay (always)
      g.fx.shake *= Math.pow(0.001, dt);
      g.fx.flash = Math.max(0, g.fx.flash - dt * 2);
      g.fx.redFlash = Math.max(0, g.fx.redFlash - dt * 1.2);

      // cosmetics always animate
      ZH.Renderer.update(dt, g);

      if (g.running && !g.gameOver) {
        if (g.modal === "door") {
          g.doorTimer -= dt;
          ZH.UI.updateDoorTimer(g.doorTimer / DOOR_TIME);
          ZH.UI.updateDoorPeephole(g, g.currentVisitor);
          if (g.doorTimer <= 0) this.resolveDoor("no");
        } else if (g.modal !== "none") {
          // reading a device: the world holds its breath, but the
          // horror on the screens still gnaws at you.
          if (g.modal === "tv" && g.phase >= 2) g.player.addStress(dt * 1.4);
          if (g.modal === "computer" && g.phase >= 3) g.player.addStress(dt * 0.8);
        } else {
          this.updateActive(dt);
        }
      }

      ZH.Audio.setTension(Math.min(1, g.phase / 4 * 0.7 + g.player.stress / 100 * 0.3));
      ZH.UI.refreshHUD(g);
      ZH.Renderer.draw(g);
    },

    updateActive(dt) {
      const g = this.game, p = g.player;
      // movement
      const bounds = { minX: 30, maxX: 450, minY: 96, maxY: 248 };
      p.update(dt, this.input, bounds);

      // story time
      g.timeElapsed += dt;

      // the TV broadcast timeline drives phase escalation
      this.updateTV(dt);

      // survive to dawn
      if (g.timeElapsed >= g.duration) { this.triggerEnding("survive"); return; }

      // panic break
      if (p.stress >= 100) { this.triggerEnding("panic"); return; }

      // proximity / prompt
      this.updateProximity();

      // schedulers
      this.updateHorror(dt);
      this.updateKnocks(dt);
      this.updateBreach(dt);

      // ambient stress relief when calm & safe & idle near coffee off
      if (p.stress > 0 && g.phase === 0) p.addStress(-dt * 0.4);
    },

    updateProximity() {
      const g = this.game, p = g.player;
      const feet = p.feet();
      let found = null;
      for (const o of g.objects) {
        if (feet.x >= o.ix && feet.x <= o.ix + o.iw &&
            feet.y >= o.iy && feet.y <= o.iy + o.ih) { found = o; break; }
      }
      g.active = found;
      if (!found) { ZH.UI.hidePrompt(); return; }
      let txt = "";
      switch (found.kind) {
        case "tv": txt = "<b>[E]</b> Watch the television"; break;
        case "computer": txt = "<b>[E]</b> Read the government terminal"; break;
        case "window":
          txt = "<b>[E]</b> Peer outside &nbsp;·&nbsp; <b>[B]</b> Barricade window (" + g.barricades.window + "/3)";
          break;
        case "coffee": txt = "<b>[E]</b> Brew a cup of coffee"; break;
        case "door":
          txt = g.doorKnocking
            ? "<b>[E]</b> Answer the door…"
            : "<b>[E]</b> Check the door &nbsp;·&nbsp; <b>[B]</b> Barricade door (" + g.barricades.door + "/3)";
          break;
      }
      ZH.UI.showPrompt(txt);
    },

    // Advance the Peclip broadcast timeline; it drives phase escalation.
    updateTV(dt) {
      const g = this.game;
      const TL = ZH.Content.TV_TIMELINE;
      if (g.tvStage >= TL.length - 1) return;
      if (g.timeElapsed < g.nextTvAt) return;
      const wasLive = g.tvView === g.tvStage;
      g.tvStage++;
      const st = TL[g.tvStage];
      g.nextTvAt = g.timeElapsed + TV_HOLDS[st.phase] + (Math.random() * 2 - 1);
      if (st.phase > g.phase) { while (g.phase < st.phase) this.unlockPhase(g.phase + 1); }
      if (typeof st.on === "function") { try { st.on(g); } catch (e) {} }
      if (wasLive) g.tvView = g.tvStage;          // auto-follow the live feed
      if (g.modal === "tv") ZH.UI.renderTV(g);
    },

    updateHorror(dt) {
      const g = this.game;
      if (g.timeElapsed < g.nextHorrorAt) return;
      const ev = ZH.Events.pickHorror(g);
      if (ev) {
        if (ev.once) g.firedOnce[ev.id] = true;
        ev.run(g);
      }
      const ranges = [[16, 24], [12, 18], [9, 14], [6, 11], [5, 9]];
      const r = ranges[g.phase];
      g.nextHorrorAt = g.timeElapsed + r[0] + Math.random() * (r[1] - r[0]);
    },

    updateKnocks(dt) {
      const g = this.game;
      // resolve a pending knock's short delay before the modal opens
      if (g.knockPending && g.modal === "none") {
        g.knockDelay -= dt;
        if (g.knockDelay <= 0) { this.openDoorModal(); return; }
        return; // wait for the modal
      }
      if (g.knockPending) return;
      if (g.timeElapsed < g.nextKnockAt) return;
      if (g.modal !== "none") return; // don't stack over a screen
      this.triggerKnock();
      const ranges = [[30, 46], [24, 38], [18, 30], [14, 24], [10, 18]];
      const r = ranges[g.phase];
      g.nextKnockAt = g.timeElapsed + r[0] + Math.random() * (r[1] - r[0]);
    },

    updateBreach(dt) {
      const g = this.game;
      if (g.phase < 3) return;
      g.nextBreachCheck -= dt;
      if (g.nextBreachCheck > 0) return;
      g.nextBreachCheck = 3.5;
      const total = g.barricades.door + g.barricades.window; // 0..6
      const weakness = (6 - total) / 6;
      let chance = 0;
      if (g.phase === 3) chance = total < 2 ? weakness * 0.12 : 0;
      else if (g.phase === 4) chance = weakness * 0.45;
      if (Math.random() < chance) {
        ZH.Audio.thud(); g.shake(6); g.fx.redFlash = 0.6;
        // a barricade absorbs the first hits before a true breach
        if (total > 0 && Math.random() < 0.6) {
          const which = g.barricades.window >= g.barricades.door ? "window" : "door";
          g.damageBarricade(which, 1);
          g.toast("Something slams into the " + which + ". Wood cracks. The barricade buckles but holds.");
          g.player.addStress(9);
        } else {
          g.toast("The barricade explodes inward. They're inside.");
          g.player.addStress(25);
          this.queueEnding("overrun", 1400);
        }
      }
    },

    /* ------------------------------------------------------------
       DOM wiring & input
       ------------------------------------------------------------ */
    wireDom() {
      const g = () => this.game;

      document.getElementById("start-btn").addEventListener("click", () => this.startGame());
      document.getElementById("restart-btn").addEventListener("click", () => {
        this.newGame();
        this.startGame();
      });

      // close buttons on device screens
      document.querySelectorAll("[data-close]").forEach((b) => {
        b.addEventListener("click", () => this.closeScreen());
      });

      // TV broadcast history navigation (◀ earlier · later ▶ up to LIVE)
      document.querySelectorAll("[data-tv]").forEach((b) => {
        b.addEventListener("click", () => {
          const gg = g();
          if (b.dataset.tv === "next") gg.tvView = Math.min(gg.tvStage, gg.tvView + 1);
          else gg.tvView = Math.max(0, gg.tvView - 1);
          ZH.Audio.blip();
          ZH.UI.renderTV(gg);
        });
      });

      // door buttons
      document.getElementById("door-yes").addEventListener("click", () => this.resolveDoor("yes"));
      document.getElementById("door-no").addEventListener("click", () => this.resolveDoor("no"));

      // mute
      document.getElementById("mute-btn").addEventListener("click", () => {
        const m = ZH.Audio.toggleMute();
        ZH.UI.setMuteIcon(m);
      });

      // keyboard
      window.addEventListener("keydown", (e) => this.onKey(e, true));
      window.addEventListener("keyup", (e) => this.onKey(e, false));
    },

    onKey(e, down) {
      const k = e.key.toLowerCase();
      const g = this.game;
      const move = {
        arrowleft: "left", a: "left",
        arrowright: "right", d: "right",
        arrowup: "up", w: "up",
        arrowdown: "down", s: "down",
      };
      if (move[k]) { this.input[move[k]] = down; e.preventDefault(); return; }
      if (!down) return;

      if (!g || !g.running) return;

      // door decision hotkeys
      if (g.modal === "door") {
        if (k === "y") this.resolveDoor("yes");
        else if (k === "n") this.resolveDoor("no");
        return;
      }

      if (k === "escape") { this.closeScreen(); return; }

      // phone is available anywhere (except mid-decision)
      if (k === "p") {
        if (g.modal === "phone") this.closeScreen();
        else if (g.modal === "none") this.openScreen("phone");
        return;
      }

      if (g.modal !== "none") return;

      if (k === "e" || k === " " || k === "enter") { this.interact(); e.preventDefault(); }
      else if (k === "b") { this.barricade(); }
      else if (k === "m") { ZH.UI.setMuteIcon(ZH.Audio.toggleMute()); }
    },
  };

  ZH.Engine = Engine;

  window.addEventListener("DOMContentLoaded", () => ZH.Engine.init());
})(window.ZH = window.ZH || {});
