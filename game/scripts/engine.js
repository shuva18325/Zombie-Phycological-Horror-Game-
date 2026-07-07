/* ============================================================
   engine.js — game controller
   Owns the game state, input, all schedulers (TV timeline, phase
   escalation, day cycle, door knocks, random horror, finale breach
   checks), the ending logic and the main animation loop.

   TIME MODEL: the run spans THREE DAYS. Each in-game day lasts
   DAY_LENGTH real seconds and maps to a 24-hour clock starting at
   08:00. The TV broadcast timeline advances underneath it all and
   sets the NATIONAL phase; your chosen zone's offset turns that
   into the LOCAL severity that actually knocks on your door.
   Exposes: window.ZH.Engine
   ============================================================ */
(function (ZH) {
  "use strict";

  const DAY_LENGTH = 140;                    // real seconds per in-game day
  const DAYS = 3;
  const DURATION = DAY_LENGTH * DAYS;        // survive this long -> dawn
  const DOOR_TIME = 9;                       // seconds to answer a knock
  const TV_HOLDS = [16, 12, 10, 9, 8];       // broadcast hold secs by national phase

  const DAY_TEXTS = {
    2: "You dozed in snatches with your back against the wall. The street outside looks worse than yesterday — and yesterday was already wrong.",
    3: "The last day. The broadcasts are almost gone, and whatever is left out there has stopped pretending. Hold on until dawn.",
  };

  // Interaction / draw layout. Single source of truth for object placement.
  function buildObjects() {
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
      return {
        id: d.id, kind: d.kind,
        fx: d.cx - fw / 2, fy: 18, fw, fh,
        ix: d.cx - 34, iy: 74, iw: 68, ih: 44,
      };
    });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const Engine = {
    game: null,
    input: { left: false, right: false, up: false, down: false },
    raf: 0,
    last: 0,

    /* ------------------------------------------------------------ */
    init() {
      const canvas = document.getElementById("game-canvas");
      ZH.Renderer.init(canvas);
      ZH.UI.init();
      ZH.Audio.preload();
      ZH.World.initPicker(
        document.getElementById("state-select"),
        document.getElementById("area-select"),
        document.getElementById("zone-chip"),
        document.getElementById("zone-desc"));

      this.wireDom();
      ZH.Renderer.load(() => {
        this.newGame(this.readLocation());
        this.loop(performance.now());
      });
    },

    readLocation() {
      const ss = document.getElementById("state-select");
      const as_ = document.getElementById("area-select");
      const st = ZH.World.byId(ss && ss.value) || ZH.World.byId("KS");
      const areaId = (as_ && ZH.World.AREAS[as_.value]) ? as_.value : "suburb";
      return { state: st, areaId };
    },

    newGame(loc) {
      const player = new ZH.Player();
      const state = loc.state;
      const zone = ZH.World.ZONES[state.zone];
      const area = ZH.World.AREAS[loc.areaId];

      this.game = {
        player,
        objects: buildObjects(),
        // location
        stateId: state.id,
        stateName: state.name,
        zoneId: state.zone,
        zone,
        areaId: loc.areaId,
        area,
        // time
        day: 1,
        dayShown: 1,
        hour: 8,
        timeElapsed: 0,
        duration: DURATION,
        // severity
        nationalPhase: 0,
        phase: 0,            // LOCAL severity (national + zone offset)
        orderIndex: 0,
        det: 0,              // window deterioration 0..4
        running: false,
        modal: "none",       // none | tv | computer | phone | door | day
        active: null,
        tvOn: true,
        tvStage: 0,
        tvView: 0,
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
        nextHorrorAt: 14,
        nextKnockAt: 22,
        nextBreachCheck: 6,
        knockPending: null,
        knockDelay: 0,
        currentVisitor: null,
        doorKnocking: false,
        doorTimer: 0,
        gameOver: false,
        audio: ZH.Audio,
        // ---- helpers bound to the state object ----
        byId(id) { return this.objects.find((o) => o.id === id); },
        anyScreenOpen() { return this.modal !== "none"; },
        clockString() {
          const h = Math.floor(this.hour);
          const m = Math.floor((this.hour % 1) * 60);
          return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
        },
        toast(msg) { ZH.UI.toast(msg); },
        shake(n) { this.fx.shake = Math.max(this.fx.shake, n); },
        damageBarricade(which, n) {
          this.barricades[which] = Math.max(0, this.barricades[which] - n);
        },
      };

      ZH.Renderer.resetWorld();
      ZH.UI.setMuteIcon(ZH.Audio.muted);
      // Seed national phase 0 content, then apply the zone offset silently.
      this.setNationalPhase(0, true);
    },

    startGame() {
      this.newGame(this.readLocation());
      ZH.Audio.init();
      ZH.Audio.resume();
      ZH.Audio.startAmbience();
      ZH.UI.clearToasts();
      ZH.UI.hideMenu();
      ZH.UI.hideEnding();
      ZH.UI.showHUD();
      const g = this.game;
      g.running = true;
      this.showDayCard(1,
        g.stateName + " · " + g.area.label + " — " + g.zone.label + ". " +
        (g.zoneId === "gray"
          ? "The government is already gone here. The districts defend themselves."
          : "The news says it's nothing. The news is wrong."));
    },

    /* ------------------------------------------------------------
       Phase escalation: national (TV-driven) -> local (zone offset)
       ------------------------------------------------------------ */
    setNationalPhase(n, silent) {
      const g = this.game;
      while (g.nationalPhase < n || (silent && g.nationalPhase === 0 && n === 0)) {
        const step = silent && n === 0 ? 0 : g.nationalPhase + 1;
        (ZH.Content.GOV_ALERTS[step] || []).forEach((a) => g.computerAlerts.push(a));
        (ZH.Content.PHONE_MSGS[step] || []).forEach((m) => g.phoneMsgs.push(m));
        if (step === 0) break;
        g.nationalPhase = step;
      }
      this.recomputeLocalPhase(silent);
    },

    recomputeLocalPhase(silent) {
      const g = this.game;
      const lp = clamp(g.nationalPhase + g.zone.offset, 0, 4);
      if (lp > g.phase || (silent && lp !== g.phase)) {
        g.phase = lp;
        g.orderIndex = lp;
        if (!silent) {
          ZH.Audio.alert();
          const banners = [
            "",
            "The news has changed its tone. A curfew is announced.",
            "SHELTER-IN-PLACE. Barricade everything. Stay away from the windows.",
            "MARTIAL LAW. The soldiers own the street now.",
            "CONTAINMENT DIRECTIVE. Your grid is outside the wall — the sweep comes at dawn.",
          ];
          if (banners[lp]) g.toast("⚠ " + banners[lp]);
          g.player.addStress(lp * 3);
        }
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
      if (g.modal === "door" || g.modal === "day") return; // these resolve themselves
      if (g.modal === "tv") { ZH.UI.closeTV(); ZH.Audio.stopTvStatic(); }
      if (g.modal === "computer") ZH.UI.closeComputer();
      if (g.modal === "phone") ZH.UI.closePhone();
      g.modal = "none";
    },

    lookOutside() {
      const g = this.game;
      const lines = [
        { t: "The street is quiet. A neighbor's porch light hums. Everything looks perfectly normal.", s: -2 },
        { t: "A police cruiser idles at the corner with its lights off. Someone hurries past, glancing back over their shoulder.", s: +3 },
        { t: "Two houses down, a window is shattered. A dark shape drags itself across the lawn and goes still. You step back from the glass.", s: +7 },
        { t: "Fires smear the skyline orange. Figures move door to door in the street below. You should not be standing at this window.", s: +8 },
        { t: "You lift the very edge of the curtain. What is out there, under the searchlights, you will not describe — not even to yourself.", s: +10 },
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
      if (g.doorKnocking && g.knockPending) { this.openDoorModal(); return; }
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

    /* ------------------------------------------------------------
       Endings
       ------------------------------------------------------------ */
    queueEnding(id, delay) {
      const g = this.game;
      g.running = false; // stop schedulers so nothing stacks over the finale
      setTimeout(() => this.triggerEnding(id), delay);
    },

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
       Day cycle
       ------------------------------------------------------------ */
    showDayCard(day, text) {
      const g = this.game;
      g.modal = "day";
      ZH.UI.showDayCard("DAY " + day + " OF " + DAYS, text);
      setTimeout(() => {
        ZH.UI.hideDayCard();
        if (g === this.game && g.modal === "day") g.modal = "none";
      }, 4200);
    },

    dayTransition() {
      const g = this.game;
      g.dayShown = g.day;
      g.player.addFatigue(-45);   // you slept, badly, in shifts
      g.player.addStress(-6);
      this.showDayCard(g.day, DAY_TEXTS[g.day] || "");
    },

    /* ------------------------------------------------------------
       Main loop
       ------------------------------------------------------------ */
    loop(now) {
      this.raf = requestAnimationFrame((t) => this.loop(t));
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      dt = Math.min(dt, 0.05);

      const g = this.game;
      if (!g) return;

      g.fx.shake *= Math.pow(0.001, dt);
      g.fx.flash = Math.max(0, g.fx.flash - dt * 2);
      g.fx.redFlash = Math.max(0, g.fx.redFlash - dt * 1.2);

      ZH.Renderer.update(dt, g);

      if (g.running && !g.gameOver) {
        if (g.modal === "door") {
          g.doorTimer -= dt;
          ZH.UI.updateDoorTimer(g.doorTimer / DOOR_TIME);
          ZH.UI.updateDoorPeephole(g, g.currentVisitor);
          if (g.doorTimer <= 0) this.resolveDoor("no");
        } else if (g.modal === "day") {
          // cinematic pause — the card dismisses itself
        } else if (g.modal !== "none") {
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
      const bounds = { minX: 30, maxX: 450, minY: 96, maxY: 248 };
      p.update(dt, this.input, bounds);

      // story time, clock & day cycle
      g.timeElapsed += dt;
      const tInDay = g.timeElapsed % DAY_LENGTH;
      g.hour = (8 + (tInDay / DAY_LENGTH) * 24) % 24;
      g.day = Math.min(DAYS, Math.floor(g.timeElapsed / DAY_LENGTH) + 1);
      g.flags.night = g.hour >= 20 || g.hour < 6;

      // the world outside decays: local severity + slow creep
      g.det = Math.min(4, g.phase + (g.timeElapsed / DURATION) * 1.2);

      if (g.day > g.dayShown) { this.dayTransition(); return; }

      // the TV broadcast timeline drives national escalation
      this.updateTV(dt);

      // survive all three days -> dawn
      if (g.timeElapsed >= g.duration) { this.triggerEnding("survive"); return; }

      // panic break
      if (p.stress >= 100) { this.triggerEnding("panic"); return; }

      this.updateProximity();
      this.updateHorror(dt);
      this.updateKnocks(dt);
      this.updateBreach(dt);

      // calm daylight in still-quiet zones lets your shoulders drop a little
      if (p.stress > 0 && g.phase <= 1 && !g.flags.night) p.addStress(-dt * 0.35);
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

    // Advance the Peclip broadcast timeline; it drives national phase.
    updateTV(dt) {
      const g = this.game;
      const TL = ZH.Content.TV_TIMELINE;
      if (g.tvStage >= TL.length - 1) return;
      if (g.timeElapsed < g.nextTvAt) return;
      const wasLive = g.tvView === g.tvStage;
      g.tvStage++;
      const st = TL[g.tvStage];
      g.nextTvAt = g.timeElapsed + TV_HOLDS[st.phase] + (Math.random() * 2 - 1);
      if (st.phase > g.nationalPhase) this.setNationalPhase(st.phase);
      if (typeof st.on === "function") { try { st.on(g); } catch (e) {} }
      if (wasLive) g.tvView = g.tvStage;
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
      const mul = g.zone.horrorMul * g.area.horrorMul;
      g.nextHorrorAt = g.timeElapsed +
        Math.max(6, (r[0] + Math.random() * (r[1] - r[0])) * mul);
    },

    updateKnocks(dt) {
      const g = this.game;
      if (g.knockPending && g.modal === "none") {
        g.knockDelay -= dt;
        if (g.knockDelay <= 0) { this.openDoorModal(); return; }
        return;
      }
      if (g.knockPending) return;
      if (g.timeElapsed < g.nextKnockAt) return;
      if (g.modal !== "none") return;
      this.triggerKnock();
      const ranges = [[30, 46], [24, 38], [18, 30], [14, 24], [10, 18]];
      const r = ranges[g.phase];
      const mul = g.zone.knockMul * g.area.knockMul;
      g.nextKnockAt = g.timeElapsed +
        Math.max(14, (r[0] + Math.random() * (r[1] - r[0])) * mul);
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
      chance *= g.zone.breachMul;
      // breaches come with the dark
      if (!g.flags.night) chance *= 0.35;
      if (Math.random() < chance) {
        ZH.Audio.thud(); g.shake(6); g.fx.redFlash = 0.6;
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
      // Back to the menu so a new state/area can be chosen for the next run.
      document.getElementById("restart-btn").addEventListener("click", () => {
        ZH.UI.hideEnding();
        ZH.UI.hideHUD();
        ZH.UI.clearToasts();
        ZH.UI.showMenu();
      });

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

      document.getElementById("door-yes").addEventListener("click", () => this.resolveDoor("yes"));
      document.getElementById("door-no").addEventListener("click", () => this.resolveDoor("no"));

      document.getElementById("mute-btn").addEventListener("click", () => {
        const m = ZH.Audio.toggleMute();
        ZH.UI.setMuteIcon(m);
      });

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

      if (g.modal === "door") {
        if (k === "y") this.resolveDoor("yes");
        else if (k === "n") this.resolveDoor("no");
        return;
      }
      if (g.modal === "day") return;

      if (k === "escape") { this.closeScreen(); return; }

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
