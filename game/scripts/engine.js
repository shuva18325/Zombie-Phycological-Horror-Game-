/* ============================================================
   engine.js — game controller
   Game state, input, all schedulers (TV timeline → national
   phase → local severity, day cycle, knocks, random horror,
   breach checks), the computer hub data (threads/unread), the
   sleep + cooking + coffee systems, endings, and the main loop.

   TIME MODEL: three days. Each day lasts DAY_LENGTH real seconds
   and maps to a 24-hour clock starting at 08:00. The TV broadcast
   timeline starts at "normal evening" and escalates the national
   phase; your zone's offset turns that into local severity.
   Exposes: window.ZH.Engine
   ============================================================ */
(function (ZH) {
  "use strict";

  const DAY_LENGTH = 140;
  const DAYS = 3;
  const DURATION = DAY_LENGTH * DAYS;
  const DOOR_TIME = 9;
  const TV_HOLDS = [16, 12, 10, 9, 8];

  const DAY_TEXTS = {
    2: "You dozed in snatches with your back against the wall. The street outside looks worse than yesterday — and yesterday was already wrong.",
    3: "The last day. The broadcasts are almost gone, and whatever is left out there has stopped pretending. Hold on until dawn.",
  };

  const MEALS = [
    "You fry two eggs and eat them standing up, watching the door. It's the best thing you've ever tasted.",
    "Chicken and rice on the hotplate. The smell almost makes the apartment feel like a home again.",
    "Toast, butter, and the last of the jam. Small mercies.",
    "You scramble eggs with whatever's left in the basket. Warm food. Steady hands.",
    "Instant noodles, upgraded with an egg. A feast, by tonight's standards.",
    "You cook the last chicken thigh slowly, savoring every minute the world stays quiet.",
  ];

  // Interaction / draw layout for the studio apartment.
  function buildObjects() {
    return [
      { id: "tv",       kind: "tv",       fx: 8,   fy: 28, fw: 96, fh: 84,  ix: 8,   iy: 112, iw: 96, ih: 42 },
      { id: "bed",      kind: "bed",      fx: 136, fy: 56, fw: 96, fh: 88,  ix: 136, iy: 118, iw: 98, ih: 48 },
      { id: "window",   kind: "window",   fx: 194, fy: 4,  fw: 196, fh: 100, ix: 240, iy: 106, iw: 152, ih: 28 },
      { id: "computer", kind: "computer", fx: 316, fy: 54, fw: 84, fh: 58,  ix: 316, iy: 136, iw: 84, ih: 42 },
      { id: "kitchen",  kind: "kitchen",  fx: 402, fy: 44, fw: 54, fh: 68,  ix: 402, iy: 112, iw: 52, ih: 44 },
      { id: "door",     kind: "door",     fx: 456, fy: 56, fw: 24, fh: 132, ix: 424, iy: 168, iw: 56, ih: 62 },
    ];
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
      player.x = 160; player.y = 205;
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
        phase: 0,
        orderIndex: 0,
        det: 0,
        running: false,
        modal: "none",      // none | tv | computer | door | day
        active: null,
        tvOn: true,
        tvStage: 0,
        tvView: 0,
        nextTvAt: TV_HOLDS[0],
        computerAlerts: [],
        threads: {},        // contactId -> [{who: them|me|sys, text}]
        threadUnread: {},   // contactId -> bool
        unread: { messages: 0, news: 0, map: 0, virus: 0, alerts: 0, social: 0 },
        supplies: 6,        // eggs, chicken, toast… breakfast stock
        sleptRecently: 0,
        barricades: { door: 0, window: 0 },
        flags: {
          night: false, powerFlicker: false, powerOut: false,
          helicopter: false, soldiersOutside: false,
          ally: false, marked: false, missedEvac: false,
        },
        fx: { shake: 0, flash: 0, redFlash: 0, coffee: 0, cooking: 0 },
        firedOnce: {},
        stats: { doorsAnswered: 0, doorsOpened: 0, barricadesBuilt: 0, coffee: 0, meals: 0 },
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
        // ---- helpers ----
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
          : "An ordinary evening. The news says it's nothing. The news is wrong."));
    },

    /* ------------------------------------------------------------
       Phase escalation: national (TV-driven) -> local (zone offset)
       ------------------------------------------------------------ */
    setNationalPhase(n, silent) {
      const g = this.game;
      const unlock = (step) => {
        (ZH.Content.GOV_ALERTS[step] || []).forEach((a) => {
          g.computerAlerts.push(a);
          g.unread.alerts++;
        });
        for (const c of ZH.Content.MESSAGES) {
          for (const m of c.thread) {
            if (m.phase === step) {
              if (!g.threads[c.id]) g.threads[c.id] = [];
              g.threads[c.id].push({ who: "them", text: m.text });
              g.threadUnread[c.id] = true;
              g.unread.messages++;
            }
          }
        }
        g.unread.news += (ZH.Content.NEWSPAPERS[step] || []).length;
        g.unread.virus += (ZH.Content.VIRUS_REPORTS[step] || []).length;
        g.unread.social += ZH.Content.SOCIAL.filter((p) => p.phase === step).length;
        if (step > 0) g.unread.map++;
      };

      if (silent && n === 0 && g.nationalPhase === 0) unlock(0);
      while (g.nationalPhase < n) {
        g.nationalPhase++;
        unlock(g.nationalPhase);
      }
      if (!silent && n > 0) {
        g.toast("💻 Your computer chimes — new messages, headlines and alerts.");
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
        case "kitchen": this.drinkCoffee(); break;
        case "bed": this.sleep(); break;
        case "door": this.checkDoor(); break;
      }
    },

    openScreen(kind) {
      const g = this.game;
      g.modal = kind;
      ZH.Audio.blip();
      if (kind === "tv") { g.tvView = g.tvStage; ZH.UI.openTV(g); ZH.Audio.startTvStatic(); }
      if (kind === "computer") ZH.UI.openComputer(g);
      ZH.UI.hidePrompt();
    },

    closeScreen() {
      const g = this.game;
      if (g.modal === "door" || g.modal === "day") return;
      if (g.modal === "tv") { ZH.UI.closeTV(); ZH.Audio.stopTvStatic(); }
      if (g.modal === "computer") ZH.UI.closeComputer();
      g.modal = "none";
    },

    lookOutside() {
      const g = this.game;
      const lines = [
        { t: "The street is quiet. A neighbor's porch light hums. Everything looks perfectly normal.", s: -2 },
        { t: "A police cruiser idles at the corner with its lights off. Someone hurries past, glancing back over their shoulder.", s: +3 },
        { t: "Two buildings down, a window is shattered. A dark shape drags itself across the sidewalk and goes still. You step back from the glass.", s: +7 },
        { t: "Fires smear the skyline orange. Figures move door to door in the street below. You should not be standing at this window.", s: +8 },
        { t: "You lift the very edge of the curtain. What is out there, under the searchlights, you will not describe — not even to yourself.", s: +10 },
      ];
      const l = lines[g.phase];
      g.toast(l.t);
      g.player.addStress(l.s);
      if (g.phase >= 3) { g.flags.helicopter = g.flags.helicopter || Math.random() < 0.5; }
    },

    /* Coffee — simple: one press, coffee made. Sharpens you up
       (visual alertness boost) and burns off fatigue. */
    drinkCoffee() {
      const g = this.game, p = g.player;
      if (p.coffeeCooldown > 0) {
        g.toast("The pot is still gurgling. Give it a moment.");
        return;
      }
      ZH.Audio.coffee();
      p.coffeeCooldown = 6;
      g.stats.coffee++;
      g.fx.coffee = 10;              // alertness: the room reads brighter
      p.addFatigue(-30);
      p.addStress(-3);
      g.toast("☕ Coffee made. Hot, bitter, grounding. The room sharpens.");
    },

    /* Breakfast — cook from the supply basket (eggs, chicken, toast…). */
    cook() {
      const g = this.game, p = g.player;
      if (g.modal !== "none") return;
      const o = g.active;
      if (!o || o.kind !== "kitchen") return;
      if (g.supplies <= 0) {
        g.toast("The basket is empty. No more eggs. No more anything.");
        return;
      }
      if (g.fx.cooking > 0) {
        g.toast("Something's already on the hotplate.");
        return;
      }
      g.supplies--;
      g.stats.meals++;
      g.fx.cooking = 6;
      ZH.Audio.coffee();
      p.addStress(-8);
      p.addFatigue(-12);
      g.toast("🍳 " + MEALS[Math.min(MEALS.length - 1, g.stats.meals - 1)]);
    },

    /* Sleep — skips 2–3 broadcast events; the world moves on without
       you and greets you with fresh notifications. */
    sleep() {
      const g = this.game;
      if (g.doorKnocking) { g.toast("Someone is at the door. Sleep is not an option."); return; }
      if (g.sleptRecently > 0) { g.toast("You just got up. Your heart is beating too hard to lie down."); return; }
      if (g.player.fatigue < 20) { g.toast("You're too wired to sleep right now."); return; }

      const skips = 2 + Math.floor(Math.random() * 2); // 2–3 events
      g.modal = "day";
      ZH.UI.showDayCard("YOU SLEEP", "Dark. Dreamless. The world does not wait for you.");
      setTimeout(() => {
        if (g !== this.game) return;
        const TL = ZH.Content.TV_TIMELINE;
        if (g.tvStage >= TL.length - 1) {
          g.timeElapsed += 25; // the broadcasts are over; time still passes
        } else {
          for (let i = 0; i < skips && g.tvStage < TL.length - 1; i++) {
            g.timeElapsed = Math.max(g.timeElapsed, g.nextTvAt);
            this.updateTV(0);
          }
        }
        // waking world: don't dump everything on the player at once
        g.nextKnockAt = Math.max(g.nextKnockAt, g.timeElapsed + 8);
        g.nextHorrorAt = Math.max(g.nextHorrorAt, g.timeElapsed + 5);
        g.player.addFatigue(-55);
        g.player.addStress(-4);
        g.sleptRecently = 40;
        ZH.UI.hideDayCard();
        if (g.modal === "day") g.modal = "none";
        g.toast("You wake. The light has changed, and your computer is blinking with notifications.");
      }, 2600);
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
       Messages: the player types back from the computer.
       ------------------------------------------------------------ */
    sendMessage(contactId, text) {
      const g = this.game;
      const contact = ZH.Content.MESSAGES.find((c) => c.id === contactId);
      if (!contact || !g.threads[contactId]) return;
      g.threads[contactId].push({ who: "me", text });
      ZH.UI.refreshMessagesIfOpen(g);
      g.player.addStress(-2); // reaching out helps

      // the reply — or the silence
      const dead = g.nationalPhase >= 4 && contactId !== "mom";
      setTimeout(() => {
        if (g !== this.game) return;
        if (dead) {
          g.threads[contactId].push({ who: "sys", text: "✖ Message could not be delivered." });
          g.player.addStress(4);
        } else {
          g.threads[contactId].push({ who: "them", text: contact.reply });
        }
        if (ZH.UI.activeApp === "messages" && g.modal === "computer") {
          ZH.UI.refreshMessagesIfOpen(g);
        } else {
          g.unread.messages++;
          g.threadUnread[contactId] = true;
          g.toast("💬 " + contact.from + (dead ? " — undeliverable." : " replied."));
        }
      }, 1400 + Math.random() * 1600);
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
      g.running = false;
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
      g.player.addFatigue(-45);
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
      g.fx.coffee = Math.max(0, g.fx.coffee - dt);
      g.fx.cooking = Math.max(0, g.fx.cooking - dt);
      if (g.sleptRecently > 0) g.sleptRecently -= dt;

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
          if (g.modal === "tv") {
            ZH.UI.tickTV(g, dt);
            if (g.phase >= 2) g.player.addStress(dt * 1.4);
          }
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
      const bounds = { minX: 24, maxX: 446, minY: 114, maxY: 248 };
      p.update(dt, this.input, bounds);

      g.timeElapsed += dt;
      const tInDay = g.timeElapsed % DAY_LENGTH;
      g.hour = (8 + (tInDay / DAY_LENGTH) * 24) % 24;
      g.day = Math.min(DAYS, Math.floor(g.timeElapsed / DAY_LENGTH) + 1);
      g.flags.night = g.hour >= 20 || g.hour < 6;

      g.det = Math.min(4, g.phase + (g.timeElapsed / DURATION) * 1.2);

      if (g.day > g.dayShown) { this.dayTransition(); return; }

      this.updateTV(dt);

      if (g.timeElapsed >= g.duration) { this.triggerEnding("survive"); return; }
      if (p.stress >= 100) { this.triggerEnding("panic"); return; }

      this.updateProximity();
      this.updateHorror(dt);
      this.updateKnocks(dt);
      this.updateBreach(dt);

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
        case "computer": {
          const n = g.unread.messages + g.unread.news + g.unread.alerts +
                    g.unread.social + g.unread.virus + g.unread.map;
          txt = "<b>[E]</b> Use the computer" + (n ? " — <b>" + n + "</b> new" : "");
          break;
        }
        case "window":
          txt = "<b>[E]</b> Look outside &nbsp;·&nbsp; <b>[B]</b> Barricade window (" + g.barricades.window + "/3)";
          break;
        case "kitchen":
          txt = "<b>[E]</b> Make coffee &nbsp;·&nbsp; <b>[C]</b> Cook breakfast (" + g.supplies + " left)";
          break;
        case "bed": txt = "<b>[E]</b> Sleep — skip ahead, wake to a changed world"; break;
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
      const total = g.barricades.door + g.barricades.window;
      const weakness = (6 - total) / 6;
      let chance = 0;
      if (g.phase === 3) chance = total < 2 ? weakness * 0.12 : 0;
      else if (g.phase === 4) chance = weakness * 0.45;
      chance *= g.zone.breachMul;
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
      document.getElementById("restart-btn").addEventListener("click", () => {
        ZH.UI.hideEnding();
        ZH.UI.hideHUD();
        ZH.UI.clearToasts();
        ZH.UI.showMenu();
      });

      document.querySelectorAll("[data-close]").forEach((b) => {
        b.addEventListener("click", () => this.closeScreen());
      });

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
      // never steal keys while the player is typing a message
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape" && down) { e.target.blur(); this.closeScreen(); }
        return;
      }

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

      if (g.modal !== "none") return;

      if (k === "e" || k === " " || k === "enter") { this.interact(); e.preventDefault(); }
      else if (k === "b") { this.barricade(); }
      else if (k === "c") { this.cook(); }
      else if (k === "m") { ZH.UI.setMuteIcon(ZH.Audio.toggleMute()); }
    },
  };

  ZH.Engine = Engine;

  window.addEventListener("DOMContentLoaded", () => ZH.Engine.init());
})(window.ZH = window.ZH || {});
