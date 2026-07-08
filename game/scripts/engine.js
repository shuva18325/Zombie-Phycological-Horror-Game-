/* ============================================================
   engine.js — game controller
   Open-ended survival: there is no fixed number of nights. The
   outbreak follows a realistic day count (normal days 1–2, curfew
   day 3, shelter-in-place day 5, martial law day 8, national
   collapse day 11) and you survive night after night until a way
   out knocks — a verified evac team, or the district militia in a
   Gray Zone. Your zone's speed decides how early the collapse
   reaches YOUR street; everyone's Day 1 is normal.

   Also owns: input, schedulers (TV pacing gated by the day arc,
   knocks, horror, breach), sleeping to next morning, hunger and
   the breakfast supply, the computer hub data, endings.
   Exposes: window.ZH.Engine
   ============================================================ */
(function (ZH) {
  "use strict";

  const DAY_LENGTH = 110;                  // real seconds per in-game 24h
  const DOOR_TIME = 9;
  const PHASE_START_DAY = [1, 3, 5, 8, 11]; // realistic outbreak arc
  const RESCUE_DAY = 12;                   // from here, ways out start knocking
  const MAX_FOOD = 8;

  const MEALS = [
    "You fry two eggs and eat them standing up, watching the door. Best thing you've ever tasted.",
    "Chicken and rice on the heat. The smell almost makes this feel like a home again.",
    "Toast, butter, and the last of the jam. Small mercies.",
    "You scramble eggs with whatever's left in the basket. Warm food. Steady hands.",
    "Instant noodles, upgraded with an egg. A feast, by tonight's standards.",
    "You cook slowly, savoring every minute the world stays quiet.",
    "Beans, straight from the pot. You've stopped being picky.",
    "The last proper meal in the basket. You make it count.",
  ];

  const DAY_FLAVOR = [
    "The news says it's nothing. The news is wrong.",
    "A curfew tonight. People are calling it an overreaction.",
    "Shelter-in-place. The street is emptier than it's ever been.",
    "Martial law. You hear engines at night and pretend you don't.",
    "The wall is finished somewhere out there. Nobody is coming to check on this street.",
  ];

  // Interaction / draw layout. US homes share one floor plan; the
  // slum room is a single CRAMPED room — thick walls, one small
  // window, an old CRT on a wall bracket, the phone on its charger.
  function buildObjects(zoneId) {
    if (zoneId === "slum") {
      // ~1/3 of the American floor plan: one cramped room, everything
      // within arm's reach of everything else.
      return [
        { id: "kitchen",  kind: "kitchen",  fx: 144, fy: 46, fw: 36, fh: 66,  ix: 142, iy: 118, iw: 42, ih: 36 },
        { id: "bed",      kind: "bed",      fx: 184, fy: 66, fw: 66, fh: 76,  ix: 184, iy: 124, iw: 66, ih: 36 },
        { id: "window",   kind: "window",   fx: 254, fy: 24, fw: 42, fh: 44,  ix: 248, iy: 106, iw: 52, ih: 26 },
        { id: "tv",       kind: "tv",       fx: 300, fy: 22, fw: 42, fh: 42,  ix: 298, iy: 106, iw: 44, ih: 26 },
        { id: "computer", kind: "computer", fx: 306, fy: 80, fw: 24, fh: 34,  ix: 298, iy: 136, iw: 44, ih: 34 },
        { id: "door",     kind: "door",     fx: 346, fy: 66, fw: 20, fh: 118, ix: 300, iy: 176, iw: 44, ih: 46 },
      ];
    }
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

  function phaseForDay(day) {
    let p = 0;
    for (let i = 0; i < PHASE_START_DAY.length; i++) {
      if (day >= PHASE_START_DAY[i]) p = i;
    }
    return p;
  }

  // Per-phase broadcast hold times so the timeline spans its real days.
  function computeTvHolds(timeline) {
    const counts = [0, 0, 0, 0, 0];
    for (const s of timeline) counts[s.phase]++;
    const windows = [];
    for (let p = 0; p < 5; p++) {
      const start = PHASE_START_DAY[p];
      const end = p < 4 ? PHASE_START_DAY[p + 1] : PHASE_START_DAY[4] + 3;
      windows[p] = Math.max(1, end - start) * DAY_LENGTH;
    }
    return windows.map((w, p) => Math.max(8, w / Math.max(1, counts[p])));
  }

  const Engine = {
    game: null,
    input: { left: false, right: false, up: false, down: false },
    raf: 0,
    last: 0,
    tvHolds: [60, 60, 60, 60, 12],
    tvHoldsSlum: [60, 60, 60, 60, 12],

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
      this.tvHolds = computeTvHolds(ZH.Content.TV_TIMELINE);
      this.tvHoldsSlum = computeTvHolds(ZH.Content.SLUM_TV_TIMELINE);

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
      if (loc.state.zone === "slum") { player.x = 240; player.y = 170; }
      const state = loc.state;
      const zone = ZH.World.ZONES[state.zone];
      const area = ZH.World.AREAS[loc.areaId];

      this.game = {
        player,
        objects: buildObjects(state.zone),
        bounds: state.zone === "slum"
          ? { minX: 150, maxX: 336, minY: 122, maxY: 224 }
          : { minX: 24, maxX: 446, minY: 114, maxY: 248 },
        // location
        stateId: state.id,
        stateName: state.name,
        zoneId: state.zone,
        zone,
        areaId: loc.areaId,
        area,
        // time — open-ended
        day: 1,
        dayShown: 1,
        hour: 8,
        timeElapsed: 0,
        // severity
        nationalPhase: 0,
        phase: 0,
        orderIndex: 0,
        det: 0,
        running: false,
        modal: "none",      // none | tv | computer | door | peek | day
        active: null,
        tvOn: true,
        tvStage: 0,
        tvView: 0,
        nextTvAt: 10,
        computerAlerts: [],
        threads: {},
        threadUnread: {},
        unread: { messages: 0, news: 0, map: 0, virus: 0, alerts: 0, social: 0, radio: 0 },
        timelineRef: state.zone === "slum" ? ZH.Content.SLUM_TV_TIMELINE : ZH.Content.TV_TIMELINE,
        contactsRef: state.zone === "slum" ? ZH.Content.SLUM_MESSAGES : ZH.Content.MESSAGES,
        supplies: MAX_FOOD,
        ateToday: false,
        hungerStreak: 0,
        sleptRecently: 0,
        sleptTonight: false,
        rescueKnocks: 0,
        // the four friends — real characters who can sicken, leave, and save you
        housemates: state.zone === "slum" ? [
          { id: "ravi",  name: "Ravi",  shirt: "#c05a3a", skin: "#a0663a", status: "well", saved: false },
          { id: "arjun", name: "Arjun", shirt: "#3a7ac0", skin: "#8a5a34", status: "well", saved: false },
          { id: "sana",  name: "Sana",  shirt: "#3aa06a", skin: "#a0663a", status: "well", saved: false },
          { id: "meera", name: "Meera", shirt: "#c0a03a", skin: "#8a5a34", status: "well", saved: false },
        ] : [],
        nextSicknessDay: 4 + Math.floor(Math.random() * 2),
        monsoonDay: state.zone === "slum" ? 6 + Math.floor(Math.random() * 3) : -1,
        nextQuestAt: 70 + Math.random() * 40,
        papersHave: 0,
        bond: {},
        currentChoice: null,
        barricades: { door: 0, window: 0 },
        flags: {
          night: false, powerFlicker: false, powerOut: false,
          helicopter: false, soldiersOutside: false,
          ally: false, marked: false, missedEvac: false,
        },
        fx: { shake: 0, flash: 0, redFlash: 0, coffee: 0, cooking: 0 },
        firedOnce: {},
        stats: { doorsAnswered: 0, doorsOpened: 0, barricadesBuilt: 0, coffee: 0, meals: 0 },
        nextHorrorAt: 16,
        nextKnockAt: 26,
        nextBreachCheck: 6,
        knockPending: null,
        knockDelay: 0,
        currentVisitor: null,
        doorKnocking: false,
        doorTimer: 0,
        currentPeek: null,
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
        addSupplies(n) {
          this.supplies = clamp(this.supplies + n, 0, MAX_FOOD);
        },
        presentMates() {
          return this.housemates.filter((h) => h.status === "well" || h.status === "sick");
        },
      };

      ZH.Renderer.resetWorld();
      ZH.UI.setMuteIcon(ZH.Audio.muted);
      this.unlockPhaseContent(0);
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
        "An ordinary morning. " + DAY_FLAVOR[0] +
        " Survive as many nights as it takes — until a way out knocks.");
    },

    /* ------------------------------------------------------------
       Phase escalation: the DAY drives the national phase; the
       zone's speed decides how fast it reaches your street.
       ------------------------------------------------------------ */
    unlockPhaseContent(step) {
      const g = this.game;
      const slum = g.zoneId === "slum";
      const alertsSrc = slum ? ZH.Content.SLUM_ALERTS : ZH.Content.GOV_ALERTS;
      (alertsSrc[step] || []).forEach((a) => {
        g.computerAlerts.push(a);
        g.unread.alerts++;
      });
      for (const c of g.contactsRef) {
        for (const m of c.thread) {
          if (m.phase === step) {
            if (!g.threads[c.id]) g.threads[c.id] = [];
            g.threads[c.id].push({ who: "them", text: m.text });
            g.threadUnread[c.id] = true;
            g.unread.messages++;
          }
        }
      }
      if (slum) {
        g.unread.radio += (ZH.Content.SLUM_RADIO[step] || []).length;
      } else {
        g.unread.news += (ZH.Content.NEWSPAPERS[step] || []).length;
        g.unread.virus += (ZH.Content.VIRUS_REPORTS[step] || []).length;
        g.unread.social += ZH.Content.SOCIAL.filter((p) => p.phase === step).length;
      }
      if (step > 0) g.unread.map++;
    },

    setNationalPhase(n, quiet) {
      const g = this.game;
      while (g.nationalPhase < n) {
        g.nationalPhase++;
        this.unlockPhaseContent(g.nationalPhase);
      }
      if (!quiet && n > 0) {
        g.toast(g.zoneId === "slum"
          ? "📱 The phone buzzes and the radio crackles — the lane has news."
          : "💻 Your computer chimes — new messages, headlines and alerts.");
      }
      this.recomputeLocalPhase(quiet);
    },

    recomputeLocalPhase(quiet) {
      const g = this.game;
      const lp = ZH.World.localPhase(g.zoneId, g.nationalPhase);
      if (lp > g.phase) {
        g.phase = lp;
        g.orderIndex = lp;
        if (!quiet) {
          ZH.Audio.alert();
          const banners = [
            "",
            "The news has changed its tone. A curfew is announced.",
            "SHELTER-IN-PLACE. Barricade everything. Stay away from the windows.",
            "MARTIAL LAW. The soldiers own the street now.",
            "CONTAINMENT. Your grid is outside every wall — you are on your own out here.",
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
      if (g.modal === "peek") { ZH.UI.closeDoor(); g.currentPeek = null; }
      if (g.modal === "lookout") ZH.UI.closeLookout();
      g.modal = "none";
    },

    // Press E at the window: you PUT YOUR FACE TO THE GLASS.
    // A full first-person view of the street, live and animated.
    lookOutside() {
      const g = this.game;
      const lines = [
        { t: "Everything out there looks perfectly, boringly normal. Enjoy it while it lasts.", s: -2 },
        { t: "Fewer lights than usual tonight. Someone hurries past, glancing back over their shoulder.", s: +3 },
        { t: "Something is wrong with the way the neighborhood sits — too still, too dark.", s: +7 },
        { t: "Smoke on the horizon. Figures moving where no one should be. Don't stand here long.", s: +8 },
        { t: "You lift the very edge of the curtain. You wish you hadn't.", s: +10 },
      ];
      const l = lines[g.phase];
      g.player.addStress(l.s);
      if (g.phase >= 3) { g.flags.helicopter = g.flags.helicopter || Math.random() < 0.5; }
      g.modal = "lookout";
      ZH.Audio.blip();
      ZH.UI.hidePrompt();
      ZH.UI.openLookout(g, l.t);
    },

    drinkCoffee() {
      const g = this.game, p = g.player;
      if (p.coffeeCooldown > 0) {
        g.toast("The pot is still gurgling. Give it a moment.");
        return;
      }
      ZH.Audio.coffee();
      p.coffeeCooldown = 6;
      g.stats.coffee++;
      g.fx.coffee = 10;
      p.addFatigue(-30);
      p.addStress(-3);
      g.toast("☕ Coffee made. Hot, bitter, grounding. The room sharpens.");
    },

    cook() {
      const g = this.game, p = g.player;
      if (g.modal !== "none") return;
      const o = g.active;
      if (!o || o.kind !== "kitchen") return;
      if (g.supplies <= 0) {
        g.toast("The basket is empty. No more eggs. No more anything. You need a visitor with food — or a way out.");
        return;
      }
      if (g.fx.cooking > 0) {
        g.toast("Something's already on the heat.");
        return;
      }
      g.supplies--;
      g.stats.meals++;
      g.ateToday = true;
      g.hungerStreak = 0;
      g.fx.cooking = 6;
      ZH.Audio.coffee();
      p.addStress(-8);
      p.addFatigue(-12);
      g.toast("🍳 " + MEALS[Math.min(MEALS.length - 1, g.stats.meals - 1)]);
    },

    /* Sleep — night ends, morning comes. The world moves on while
       you're out: broadcasts air, and sometimes things test the
       house in the dark. */
    sleep() {
      const g = this.game;
      if (g.doorKnocking) { g.toast("Someone is at the door. Sleep is not an option."); return; }
      if (g.sleptRecently > 0) { g.toast("You just got up. Your heart is beating too hard to lie down."); return; }
      if (g.hour >= 8 && g.hour < 19 && g.player.fatigue < 60) {
        g.toast("It's the middle of the day and you're too wired. Maybe after dark — or once you're truly exhausted.");
        return;
      }

      g.modal = "day";
      g.sleptTonight = true;
      ZH.UI.showDayCard("YOU SLEEP", "Dark. Dreamless. The world does not wait for you.");
      setTimeout(() => {
        if (g !== this.game) return;
        // jump to 08:00 next morning
        g.timeElapsed = g.day * DAY_LENGTH + 0.01;

        // the night was not necessarily quiet
        if (g.phase >= 3 && Math.random() < 0.45) {
          const which = Math.random() < 0.5 ? "door" : "window";
          if (g.barricades[which] > 0) {
            g.damageBarricade(which, 1);
            g.toast("Something tested the " + which + " while you slept. A plank is split.");
          } else {
            g.player.addStress(10);
            g.toast("There are new scratches on the outside of the " + which + ". You slept through it.");
          }
        }

        // catch the broadcasts you slept through (quietly)
        const realToast = g.toast;
        g.toast = function () {};
        const np = phaseForDay(Math.floor(g.timeElapsed / DAY_LENGTH) + 1);
        if (np > g.nationalPhase) this.setNationalPhase(np, true);
        for (let i = 0; i < 40; i++) {
          if (g.tvStage >= g.timelineRef.length - 1) break;
          if (g.timeElapsed < g.nextTvAt) break;
          this.updateTV(0);
        }
        g.toast = realToast;

        g.nextKnockAt = Math.max(g.nextKnockAt, g.timeElapsed + 10);
        g.nextHorrorAt = Math.max(g.nextHorrorAt, g.timeElapsed + 6);
        g.player.addFatigue(-60);
        g.player.addStress(-5);
        g.sleptRecently = 30;
        ZH.UI.hideDayCard();
        if (g.modal === "day") g.modal = "none";
      }, 2400);
    },

    checkDoor() {
      const g = this.game;
      if (g.doorKnocking && g.knockPending) { this.openDoorModal(); return; }
      // look through the peephole any time
      this.peekDoor();
    },

    peekDoor() {
      const g = this.game;
      let peek;
      const scare = g.phase >= 2 && Math.random() < 0.12;
      if (scare) {
        peek = {
          sprite: "infected", color: "#5a6b4e",
          title: "THE PEEPHOLE",
          desc: "Something is standing on your doorstep. Not knocking. Not moving. Just… standing there, head tilted, as if it can hear you breathing on the other side of the wood.",
        };
        g.player.addStress(9);
        ZH.Audio.whisper();
      } else {
        const descs = [
          "The porch is empty. The street beyond looks like any other quiet day. Everything is fine. Probably.",
          "Empty. A neighbor's cat crosses the street and disappears under a car. Nothing else moves.",
          "Empty — but the street beyond is wrong somehow. Doors hanging open that shouldn't be.",
          "Empty. Smoke drifts across the end of the street. Something metallic glints and is gone.",
          "Empty. The outside world is a held breath. You let the peephole go dark and step back.",
        ];
        peek = {
          sprite: "empty", color: "#000",
          title: "THE PEEPHOLE",
          desc: descs[g.phase],
        };
      }
      g.currentPeek = peek;
      g.modal = "peek";
      ZH.UI.hidePrompt();
      ZH.UI.openDoor(g, peek, true);
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
       Messages
       ------------------------------------------------------------ */
    /* The reply brain: reads what you typed, answers in character,
       and warms up the more you actually talk to someone. */
    replyFor(contact, text) {
      const g = this.game;
      const brain = ZH.Content.BRAINS[contact.id];
      if (!brain) return contact.reply;
      const t = (text || "").toLowerCase();
      let intent = "default";
      if (/love|❤|🖤|💛|miss you|miss u/.test(t)) intent = "love";
      else if (/scared|afraid|help|worried|panic|can'?t do this/.test(t)) intent = "fear";
      else if (/food|eat|hungry|water|supplies|cook/.test(t)) intent = "food";
      else if (/zombie|walker|infected|kachra|heap|bite|monster/.test(t)) intent = "zombie";
      else if (/\?/.test(t)) intent = "question";
      else if (/ok|okay|fine|good|safe|alive|we're all/.test(t)) intent = "ok";
      const bond = g.bond[contact.id] || 0;
      if (bond >= 4 && brain.warm && Math.random() < 0.3) {
        return brain.warm[bond % brain.warm.length];
      }
      const pool = brain[intent] || brain.default;
      return pool[bond % pool.length];
    },

    sendMessage(contactId, text) {
      const g = this.game;
      const contact = g.contactsRef.find((c) => c.id === contactId);
      if (!contact || !g.threads[contactId]) return;
      g.threads[contactId].push({ who: "me", text });
      g.bond[contactId] = (g.bond[contactId] || 0) + 1;
      ZH.UI.refreshMessagesIfOpen(g);
      g.player.addStress(-2);

      const reply = this.replyFor(contact, text);
      const dead = g.nationalPhase >= 4 && g.zoneId !== "slum" && contactId !== "mom";
      setTimeout(() => {
        if (g !== this.game) return;
        if (dead) {
          g.threads[contactId].push({ who: "sys", text: "✖ Message could not be delivered." });
          g.player.addStress(4);
        } else {
          g.threads[contactId].push({ who: "them", text: reply });
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
       Door knock flow — from RESCUE_DAY on, ways out start knocking.
       ------------------------------------------------------------ */
    triggerKnock() {
      const g = this.game;
      let visitor = null;
      // Chotu's courier runs (slum, while the lanes still function)
      if (!visitor && g.zoneId === "slum" && !g.chotuQuest &&
          g.timeElapsed >= g.nextQuestAt && g.phase >= 1 && g.phase <= 3) {
        g.nextQuestAt = g.timeElapsed + 180 + Math.random() * 80;
        const q = ZH.Content.CHOTU_QUESTS[(g.stats.quests || 0) % ZH.Content.CHOTU_QUESTS.length];
        const self = this;
        visitor = {
          sprite: "person", color: "#3a9ac0",
          title: "CHOTU — WITH A JOB",
          desc: q.ask,
          yesLabel: q.yesLabel, noLabel: q.noLabel,
          resolve(choice, game) {
            if (choice === "yes") {
              if (game.supplies < q.cost) {
                return { stress: 2, message: "You check the basket — empty hands. 'Next time, uncle!' Chotu sprints off to ask the next house." };
              }
              game.addSupplies(-q.cost);
              game.stats.quests = (game.stats.quests || 0) + 1;
              game.chotuQuest = { due: game.timeElapsed + q.delay, done: q.done, reward: q.reward };
              return { stress: -3, message: "Chotu pockets it like contraband, salutes, and VANISHES down the lane. Now you wait." };
            }
            return { stress: 2, message: "'FINE, uncle.' He's already knocking next door. The lane's errands wait for no one." };
          },
        };
      }
      if (g.day >= RESCUE_DAY && g.phase >= 3) {
        g.rescueKnocks++;
        if (g.rescueKnocks % 2 === 1) {
          visitor = g.zoneId === "slum" ? ZH.Events._exodus()
            : g.zoneId === "gray" ? ZH.Events._militiaEscort()
            : ZH.Events._evac();
        }
      }
      g.knockPending = visitor || ZH.Events.makeVisitor(g);
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
      ZH.UI.openDoor(g, g.currentVisitor, false);
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
        if (res.ending === "infected" && this.trySave("door")) return;
        if (choice === "yes" && visitor.sprite === "infected") ZH.Audio.scream();
        if (visitor.sprite === "soldier") ZH.Audio.thud();
        if (ZH.Content.ENDINGS[res.ending].mood !== "good") {
          g.player.addStress(30);
          g.fx.redFlash = 0.5;
        }
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
       Day cycle & hunger
       ------------------------------------------------------------ */
    showDayCard(day, text) {
      const g = this.game;
      g.modal = "day";
      ZH.UI.showDayCard("DAY " + day, text);
      setTimeout(() => {
        ZH.UI.hideDayCard();
        if (g === this.game && g.modal === "day") g.modal = "none";
      }, 4200);
    },

    dayTransition() {
      const g = this.game;
      g.dayShown = g.day;

      // hunger: you need to eat every day
      if (!g.ateToday) {
        g.hungerStreak++;
        g.player.addStress(8 + g.hungerStreak * 6);
        g.toast("Your stomach aches. You didn't eat yesterday" +
          (g.supplies <= 0 ? " — and the basket is empty." : "."));
      }
      g.ateToday = false;

      if (!g.sleptTonight) {
        g.player.addFatigue(-15); // you dozed upright, badly
        g.toast("You stayed up through the night. Your eyes feel full of sand.");
      }
      g.sleptTonight = false;

      // the monsoon breaks over the lane
      if (g.zoneId === "slum" && g.day === g.monsoonDay) {
        g.flags.monsoon = true;
        ZH.Audio.rain(true);
        g.nextKnockAt = Math.max(g.nextKnockAt, g.timeElapsed + 25);
        this.showDayCard(g.day,
          "THE MONSOON. The sky opens like a wound and the lane becomes a river. " +
          "Water pours through the heaps — and what was sleeping inside them washes out into the open, flailing, drowning. " +
          "The radio: 'Stay in. Let the rain do the work.'");
        g.player.addStress(6);
        return;
      }
      if (g.zoneId === "slum" && g.flags.monsoon) {
        g.flags.monsoon = false;
        ZH.Audio.rain(false);
        ZH.Renderer.world.shamblers = [];
        g.nextHorrorAt = Math.max(g.nextHorrorAt, g.timeElapsed + 30);
        g.player.addStress(-8);
        this.showDayCard(g.day,
          "The rain stops before dawn. The lane drips and steams. The heaps sit flat and quiet, " +
          "washed half away — and everything that crawled out of them last night went down the Mithi with the flood. " +
          "The watch counts the lane: everyone's here.");
        return;
      }

      const flavor = DAY_FLAVOR[Math.min(4, phaseForDay(g.day))] +
        (g.day >= RESCUE_DAY && g.phase >= 3
          ? " Listen for the knock — some of them are real ways out now."
          : "");
      this.showDayCard(g.day, flavor);
    },

    /* ------------------------------------------------------------
       Housemates: fever in a crowded room. You decide what happens.
       ------------------------------------------------------------ */
    housemateFever() {
      const g = this.game;
      const candidates = g.housemates.filter((h) => h.status === "well");
      if (!candidates.length) { g.nextSicknessDay = g.day + 99; return; }
      const mate = candidates[Math.floor(Math.random() * candidates.length)];
      g.nextSicknessDay = g.day + 3 + Math.floor(Math.random() * 3);
      mate.status = "sick";
      this.showChoice({
        sprite: "person", color: mate.shirt,
        title: mate.name.toUpperCase() + " HAS A FEVER",
        desc: mate.name + " is shivering on the mat, eyes glassy, joking badly about it. It's dengue season — it's PROBABLY dengue. But there is no clinic, no doctor, and no way to be sure. The room goes quiet, waiting for you.",
        yesLabel: "TEND TO " + mate.name.toUpperCase() + " YOURSELF",
        noLabel: "SEND THEM TO AUNTY'S SICK-ROOM",
        onYes: () => {
          if (Math.random() < 0.18) {
            mate.status = "lost";
            g.player.addStress(24);
            g.toast("The fever climbs all night. By morning " + mate.name + " isn't " + mate.name +
              " anymore — the watch comes with rods and blankets, gentle as they can be. The mat has an empty place now.");
          } else {
            setTimeout(() => {
              if (g !== this.game) return;
              mate.status = "well";
              g.toast(mate.name + "'s fever breaks by evening — dengue-season fever, nothing worse. They sit up asking for chai and everyone breathes again.");
              g.player.addStress(-10);
            }, 20000);
            g.toast("You sponge " + mate.name + "'s forehead and stay close. The others keep watch in shifts around you.");
          }
        },
        onNo: () => {
          mate.status = "gone";
          g.player.addStress(9);
          g.toast("The watch carries " + mate.name + " to the aunty network's sick-room, three lanes over. Safer for everyone. The room is quieter than you'd like tonight.");
          // they come back if it really was just dengue
          setTimeout(() => {
            if (g !== this.game) return;
            if (Math.random() < 0.7) {
              mate.status = "well";
              g.toast("A familiar knock-pattern — " + mate.name + " is BACK, thinner and grinning. 'Dengue,' they say, like a trophy. The mat is full again.");
              g.player.addStress(-12);
            }
          }, 45000);
        },
      });
    },

    /* Generic YES/NO choice card (reuses the door modal). */
    showChoice(cfg) {
      const g = this.game;
      g.currentChoice = cfg;
      g.modal = "choice";
      ZH.UI.hidePrompt();
      ZH.UI.openDoor(g, cfg, false);
    },

    resolveChoice(choice) {
      const g = this.game;
      const c = g.currentChoice;
      if (!c) return;
      g.currentChoice = null;
      ZH.UI.closeDoor();
      g.modal = "none";
      if (choice === "yes" && c.onYes) c.onYes();
      if (choice === "no" && c.onNo) c.onNo();
    },

    /* A housemate throws themselves between you and the ending. */
    trySave(context) {
      const g = this.game;
      if (g.zoneId !== "slum") return false;
      const heroes = g.housemates.filter((h) => h.status === "well" && !h.saved);
      if (!heroes.length) return false;
      const hero = heroes[Math.floor(Math.random() * heroes.length)];
      hero.saved = true;
      g.player.addStress(18);
      g.fx.redFlash = 0.4;
      ZH.Audio.thud();
      if (context === "breach") {
        g.barricades.door = Math.min(3, g.barricades.door + 1);
        g.toast("⚡ " + hero.name + " is already moving — slams their whole body against the frame and jams a rod across it. 'NOT TONIGHT,' they scream. The door holds. Your heart doesn't slow for an hour.");
      } else {
        g.toast("⚡ A hand yanks you backward by the collar — " + hero.name + " — and the door slams on the thing's arm. Rods finish it through the gap. You owe them your life, and everyone knows it.");
      }
      if (Math.random() < 0.35) {
        hero.status = "gone";
        g.toast(hero.name + " got scraped in the scuffle. The watch walks them to aunty's sick-room to be safe. The mat feels enormous tonight.");
      }
      return true;
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
        } else if (g.modal === "peek") {
          ZH.UI.updateDoorPeephole(g, g.currentPeek);
        } else if (g.modal === "lookout") {
          ZH.UI.tickLookout(g);
        } else if (g.modal === "choice") {
          if (g.currentChoice) ZH.UI.updateDoorPeephole(g, g.currentChoice);
        } else if (g.modal === "day") {
          // cinematic pause
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
      p.update(dt, this.input, g.bounds);

      g.timeElapsed += dt;
      const tInDay = g.timeElapsed % DAY_LENGTH;
      g.hour = (8 + (tInDay / DAY_LENGTH) * 24) % 24;
      g.day = Math.floor(g.timeElapsed / DAY_LENGTH) + 1;
      g.flags.night = g.hour >= 20 || g.hour < 6;

      // the day drives the national phase — a realistic outbreak arc
      const np = phaseForDay(g.day);
      if (np > g.nationalPhase) this.setNationalPhase(np);

      g.det = Math.min(4, g.phase + (g.day - 1) * 0.12);

      if (g.day > g.dayShown) { this.dayTransition(); return; }

      // the slum's unique victory: the environment kills the virus.
      // Hold the lane long enough and you simply... outlive it.
      if (g.zoneId === "slum" && g.day >= 16) { this.triggerEnding("holdfast"); return; }

      this.updateTV(dt);

      if (p.stress >= 100) { this.triggerEnding("panic"); return; }

      // friends in the room: stress never climbs the way it does alone —
      // and SITTING WITH THEM (near the mat) melts it away far faster
      // than anything in America can
      if (g.zoneId === "slum" && p.stress > 0) {
        const n = g.presentMates().length;
        const base = 0.12 * n;
        const dx = p.x - 205, dy = p.y - 200;   // the mat, where they sit
        const near = n > 0 && (dx * dx + dy * dy) < 75 * 75;
        p.addStress(-dt * (base + (near ? 1.1 : 0)) * (g.phase >= 4 ? 0.65 : 1));
      }

      // Chotu's courier runs come home
      if (g.chotuQuest && g.timeElapsed >= g.chotuQuest.due) {
        const q = g.chotuQuest;
        g.chotuQuest = null;
        g.toast("🏃 " + q.done);
        try { q.reward(g); } catch (e) {}
      }

      // sickness in a crowded room (one housemate at a time)
      if (g.zoneId === "slum" && g.day >= g.nextSicknessDay && g.modal === "none" &&
          !g.doorKnocking && !g.currentChoice) {
        this.housemateFever();
      }

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
          txt = "<b>[E]</b> Use the " + (g.zoneId === "slum" ? "phone" : "computer") +
                (n ? " — <b>" + n + "</b> new" : "");
          break;
        }
        case "window":
          txt = "<b>[E]</b> Look outside &nbsp;·&nbsp; <b>[B]</b> Barricade window (" + g.barricades.window + "/3)";
          break;
        case "kitchen":
          txt = "<b>[E]</b> Make coffee &nbsp;·&nbsp; <b>[C]</b> Cook a meal (" + g.supplies + " left)";
          break;
        case "bed": txt = "<b>[E]</b> Sleep until morning"; break;
        case "door":
          txt = g.doorKnocking
            ? "<b>[E]</b> Answer the door…"
            : "<b>[E]</b> Look through the peephole &nbsp;·&nbsp; <b>[B]</b> Barricade door (" + g.barricades.door + "/3)";
          break;
      }
      ZH.UI.showPrompt(txt);
    },

    // Broadcasts air on a realistic schedule inside their phase's days;
    // a segment never airs before its phase's day arrives.
    updateTV(dt) {
      const g = this.game;
      const TL = g.timelineRef;
      if (g.tvStage >= TL.length - 1) return;
      if (g.timeElapsed < g.nextTvAt) return;
      const next = TL[g.tvStage + 1];
      if (next.phase > g.nationalPhase) {
        g.nextTvAt = g.timeElapsed + 5; // hold for the story to catch up
        return;
      }
      const wasLive = g.tvView === g.tvStage;
      g.tvStage++;
      const holds = g.zoneId === "slum" ? this.tvHoldsSlum : this.tvHolds;
      g.nextTvAt = g.timeElapsed + holds[next.phase] * (0.85 + Math.random() * 0.3);
      if (typeof next.on === "function") { try { next.on(g); } catch (e) {} }
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
      const ranges = [[18, 28], [13, 20], [10, 15], [7, 12], [5, 9]];
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
      const ranges = [[34, 50], [26, 40], [20, 32], [15, 25], [11, 19]];
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
      if (g.phase === 3) chance = total < 2 ? weakness * 0.10 : 0;
      else if (g.phase === 4) chance = weakness * 0.4;
      chance *= g.zone.breachMul;
      if (!g.flags.night) chance *= 0.35;
      if (Math.random() < chance) {
        ZH.Audio.thud(); g.shake(6); g.fx.redFlash = 0.6;
        if (total > 0 && Math.random() < 0.6) {
          const which = g.barricades.window >= g.barricades.door ? "window" : "door";
          g.damageBarricade(which, 1);
          g.toast("Something slams into the " + which + ". Wood cracks. The barricade buckles but holds.");
          g.player.addStress(9);
        } else if (!this.trySave("breach")) {
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

      document.getElementById("door-yes").addEventListener("click", () => {
        if (this.game && this.game.modal === "choice") this.resolveChoice("yes");
        else this.resolveDoor("yes");
      });
      document.getElementById("door-no").addEventListener("click", () => {
        if (this.game && this.game.modal === "choice") this.resolveChoice("no");
        else this.resolveDoor("no");
      });
      document.getElementById("door-back").addEventListener("click", () => this.closeScreen());

      document.getElementById("mute-btn").addEventListener("click", () => {
        const m = ZH.Audio.toggleMute();
        ZH.UI.setMuteIcon(m);
      });

      window.addEventListener("keydown", (e) => this.onKey(e, true));
      window.addEventListener("keyup", (e) => this.onKey(e, false));
    },

    onKey(e, down) {
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
      if (g.modal === "choice") {
        if (k === "y") this.resolveChoice("yes");
        else if (k === "n") this.resolveChoice("no");
        return;
      }
      if (g.modal === "peek" || g.modal === "lookout") {
        if (k === "escape" || k === "e" || k === " ") this.closeScreen();
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
