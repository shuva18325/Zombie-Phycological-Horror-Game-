/* ============================================================
   ui.js — DOM view layer
   HUD, toasts, the TV (with the animated news reporter and the
   live mini-map), the COMPUTER HUB (tile OS: Messages with typed
   replies, Newspapers, National Map, Virus Reports, Emergency
   Alerts, Social feed), the door modal, day cards, menu/ending.
   Exposes: window.ZH.UI
   ============================================================ */
(function (ZH) {
  "use strict";

  const APP_TITLES = {
    messages: "MESSAGES",
    radio: "FM 92.7 — GALLI RADIO",
    news: "NEWSPAPER",
    map: "NATIONAL MAP",
    virus: "VIRUS REPORT",
    alerts: "EMERGENCY ALERTS",
    social: "SOCIAL",
  };

  const UI = {
    el: {},
    activeApp: null,
    activeContact: null,
    faceT: 0,

    init() {
      const $ = (id) => document.getElementById(id);
      this.el = {
        hud: $("hud"),
        clock: $("clock"),
        dayChip: $("day-chip"),
        locChip: $("loc-chip"),
        phase: $("phase"),
        dayCard: $("day-card"),
        dayCardTitle: $("day-card-title"),
        dayCardText: $("day-card-text"),
        order: $("order-banner"),
        stress: $("stress-fill"),
        fatigue: $("fatigue-fill"),
        barricade: $("barricade-status"),
        prompt: $("prompt"),
        // tv
        tv: $("screen-tv"),
        tvInner: document.querySelector("#screen-tv .tv-inner"),
        tvChannel: $("tv-channel"),
        tvLive: $("tv-live"),
        tvHeadline: $("tv-headline"),
        tvBody: $("tv-body"),
        tvTicker: $("tv-ticker-text"),
        tvFace: $("tv-face"),
        tvMinimap: $("tv-minimap"),
        // computer
        computer: $("screen-computer"),
        pcHome: $("pc-home"),
        pcApp: $("pc-app"),
        pcAppTitle: $("pc-app-title"),
        pcAppBody: $("pc-app-body"),
        pcBack: $("pc-back"),
        pcClock: $("pc-clock"),
        pcNet: $("pc-net"),
        // door
        doorModal: $("door-modal"),
        doorTitle: $("door-title"),
        doorDesc: $("door-desc"),
        doorTimer: $("door-timer"),
        peephole: $("peephole-canvas"),
        // overlays
        menu: $("menu"),
        ending: $("ending"),
        endingTitle: $("ending-title"),
        endingText: $("ending-text"),
        endingStats: $("ending-stats"),
        mute: $("mute-btn"),
      };
      const tc = document.createElement("div");
      tc.id = "toast-container";
      tc.style.cssText =
        "position:absolute;left:50%;bottom:14%;transform:translateX(-50%);" +
        "z-index:30;display:flex;flex-direction:column;gap:6px;align-items:center;" +
        "pointer-events:none;max-width:80%;";
      document.getElementById("game-frame").appendChild(tc);
      this.el.toastContainer = tc;
      this.peepCtx = this.el.peephole.getContext("2d");
      this.faceCtx = this.el.tvFace.getContext("2d");
      this.minimapCtx = this.el.tvMinimap.getContext("2d");

      // computer hub wiring
      document.querySelectorAll(".tile").forEach((t) => {
        t.addEventListener("click", () => {
          const game = ZH.Engine.game;
          if (game) this.openApp(game, t.dataset.app);
        });
      });
      this.el.pcBack.addEventListener("click", () => this.showPcHome());
    },

    /* ---------------- HUD ---------------- */
    refreshHUD(game) {
      this.el.clock.textContent = game.clockString();
      this.el.dayChip.textContent = "DAY " + game.day;
      if (game.zone) {
        this.el.locChip.textContent = game.stateName + " · " + game.area.label;
        this.el.locChip.style.borderLeftColor = game.zone.color;
      }
      this.el.phase.textContent = "SITUATION: " + ZH.Content.PHASES[game.phase];
      this.el.phase.style.color =
        game.phase >= 3 ? "#d0473e" : game.phase >= 2 ? "#e0a83c" : "#7ec36b";

      if (game.orderIndex > 0) {
        this.el.order.classList.remove("hidden");
        const slumOrders = [
          "", "CURFEW IN EFFECT — 9:00 PM", "JANATA CURFEW — SECTION 144",
          "ARMY CORDON — NOBODY IN OR OUT", "ATTRITION ZONE — HOLD YOUR LANE",
        ];
        this.el.order.textContent = "⚠ " + (game.zoneId === "slum"
          ? slumOrders[game.orderIndex]
          : ZH.Content.ORDERS[game.orderIndex]);
      } else {
        this.el.order.classList.add("hidden");
      }

      this.el.stress.style.width = game.player.stress + "%";
      this.el.fatigue.style.width = game.player.fatigue + "%";

      const b = game.barricades;
      const bar = (n) => "▮".repeat(n) + "▯".repeat(3 - n);
      this.el.barricade.innerHTML =
        "DOOR <b>" + bar(b.door) + "</b>&nbsp;&nbsp;WINDOWS <b>" + bar(b.window) +
        "</b>&nbsp;&nbsp;FOOD <b>" + "▮".repeat(Math.max(0, game.supplies)) +
        "▯".repeat(Math.max(0, 8 - game.supplies)) + "</b>";
    },

    showHUD() { this.el.hud.classList.remove("hidden"); },
    hideHUD() { this.el.hud.classList.add("hidden"); },

    /* ---------------- day transition card ---------------- */
    showDayCard(title, text) {
      this.el.dayCardTitle.textContent = title;
      this.el.dayCardText.textContent = text;
      this.el.dayCard.classList.remove("hidden");
    },
    hideDayCard() { this.el.dayCard.classList.add("hidden"); },

    /* ---------------- prompt ---------------- */
    showPrompt(html) {
      this.el.prompt.innerHTML = html;
      this.el.prompt.classList.remove("hidden");
    },
    hidePrompt() { this.el.prompt.classList.add("hidden"); },

    /* ---------------- toasts ---------------- */
    toast(msg) {
      const t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText =
        "background:rgba(6,9,14,0.9);border:1px solid #2c3442;color:#c9d2dc;" +
        "padding:6px 12px;font-size:clamp(9px,1.5vw,13px);border-radius:4px;" +
        "text-align:center;opacity:0;transition:opacity .3s;letter-spacing:.5px;" +
        "box-shadow:0 2px 12px rgba(0,0,0,.6);";
      this.el.toastContainer.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = "1"; });
      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 400);
      }, 4200);
      while (this.el.toastContainer.children.length > 4) {
        this.el.toastContainer.firstChild.remove();
      }
    },
    clearToasts() {
      if (this.el.toastContainer) this.el.toastContainer.innerHTML = "";
    },

    /* ================= TV ================= */
    openTV(game) {
      this.faceT = 0;
      this.renderTV(game);
      this.el.tv.classList.remove("hidden");
    },
    closeTV() { this.el.tv.classList.add("hidden"); },

    renderTV(game) {
      const TL = game.timelineRef || ZH.Content.TV_TIMELINE;
      const idx = Math.max(0, Math.min(game.tvView, TL.length - 1));
      const item = TL[idx];
      const live = idx === game.tvStage;

      this.el.tvChannel.textContent = item.channel + "  ·  SEG " + item.id;
      this.el.tvHeadline.textContent = item.headline || "";
      this.el.tvBody.textContent = item.body || "";
      this.el.tvTicker.textContent = item.ticker ? item.ticker + "  ·  " : "";

      if (live) {
        this.el.tvLive.textContent = "● LIVE";
        this.el.tvLive.classList.remove("replay");
      } else {
        this.el.tvLive.textContent = "◄ REPLAY " + (idx + 1) + "/" + (game.tvStage + 1);
        this.el.tvLive.classList.add("replay");
      }

      this.el.tvInner.classList.remove("static", "emergency", "black");
      if (item.special) this.el.tvInner.classList.add(item.special);

      // mini-map beside the reporter during National Report segments
      const isReport = /NATIONAL REPORT|SIGNING OFF/.test(item.channel);
      this.el.tvMinimap.classList.toggle("hidden", !isReport);
      if (isReport) {
        ZH.World.drawMap(this.minimapCtx, this.el.tvMinimap.width, this.el.tvMinimap.height, game);
      }
      this.drawReporter(game, item);
    },

    /** Called each frame by the engine while the TV is open. */
    tickTV(game, dt) {
      this.faceT += dt;
      const TL = game.timelineRef || ZH.Content.TV_TIMELINE;
      const item = TL[Math.max(0, Math.min(game.tvView, TL.length - 1))];
      if (!item.special) this.drawReporter(game, item);
    },

    /* The news reporter — a detailed, animated pixel-art face that
       falls apart with the broadcast: tidy anchor → worried → sweating,
       disheveled, bloodshot as the country collapses. */
    drawReporter(game, item) {
      const ctx = this.faceCtx;
      const W = 120, H = 120;
      const t = this.faceT;
      const ph = game.nationalPhase != null ? game.nationalPhase : game.phase;
      const grim = ph >= 3;
      const final_ = ph >= 4;
      const slum = game.zoneId === "slum";

      ctx.imageSmoothingEnabled = false;
      // studio backdrop (the slum channel runs hot reds and marigold)
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      if (slum) {
        bg.addColorStop(0, final_ ? "#3a1210" : "#6e1512");
        bg.addColorStop(1, final_ ? "#1d0a08" : "#3a0d0b");
      } else {
        bg.addColorStop(0, final_ ? "#2a1418" : "#1d3a52");
        bg.addColorStop(1, final_ ? "#180a0c" : "#12253a");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // backdrop stripe + logo
      ctx.fillStyle = slum ? "rgba(232,212,77,0.30)"
        : final_ ? "rgba(200,60,50,0.25)" : "rgba(120,180,220,0.15)";
      ctx.fillRect(0, 16, W, 10);
      ctx.fillStyle = slum ? "#e8a020" : final_ ? "#c04038" : "#3a7ab0";
      ctx.fillRect(4, 4, slum ? 40 : 24, 10);
      ctx.fillStyle = slum ? "#3a0d0b" : "#fff";
      ctx.font = "7px monospace";
      ctx.fillText(slum ? "BHARAT24x7" : "NNC", 7, 12);

      // news desk
      ctx.fillStyle = "#27313a";
      ctx.fillRect(0, 100, W, 20);
      ctx.fillStyle = "#1c242b";
      ctx.fillRect(0, 100, W, 3);

      // ---- body: suit, shirt, tie ----
      ctx.fillStyle = "#23262e";
      ctx.fillRect(28, 84, 64, 18);              // shoulders/suit
      ctx.fillStyle = "#e8e6df";
      ctx.beginPath();                            // shirt triangle
      ctx.moveTo(54, 84); ctx.lineTo(66, 84); ctx.lineTo(60, 100);
      ctx.closePath(); ctx.fill();
      // tie (loosened + crooked when grim)
      ctx.fillStyle = "#7a1f26";
      if (grim) {
        ctx.save();
        ctx.translate(60, 86);
        ctx.rotate(0.18);
        ctx.fillRect(-3, 0, 6, 15);
        ctx.restore();
        // open collar
        ctx.fillStyle = "#d9b08c";
        ctx.fillRect(57, 84, 6, 3);
      } else {
        ctx.fillRect(57, 85, 6, 14);
      }

      // ---- head ----
      let skin = final_ ? "#cbb39c" : grim ? "#d3ac88" : "#d9b08c";
      let shade = final_ ? "#b39c86" : "#c09a78";
      if (slum) {
        skin = final_ ? "#8a5c3e" : grim ? "#96633e" : "#a0683f";
        shade = final_ ? "#74503a" : "#845636";
      }
      // neck
      ctx.fillStyle = skin;
      ctx.fillRect(53, 74, 14, 12);
      // face
      ctx.fillStyle = skin;
      ctx.fillRect(40, 30, 40, 46);
      ctx.fillRect(38, 38, 44, 30);               // cheeks/width
      // jaw shading
      ctx.fillStyle = shade;
      ctx.fillRect(40, 68, 40, 8);
      // ears
      ctx.fillStyle = skin;
      ctx.fillRect(34, 46, 6, 12);
      ctx.fillRect(80, 46, 6, 12);
      ctx.fillStyle = shade;
      ctx.fillRect(36, 50, 2, 5);
      ctx.fillRect(82, 50, 2, 5);

      // hair (side part; stray strands when grim)
      ctx.fillStyle = slum ? "#0f0c0a" : "#3a2e24";
      ctx.fillRect(38, 22, 44, 12);
      ctx.fillRect(36, 28, 8, 16);
      ctx.fillRect(78, 28, 6, 14);
      ctx.fillRect(44, 18, 32, 8);
      if (grim) {
        ctx.fillRect(42, 14, 3, 8);               // strands sticking up
        ctx.fillRect(60, 12, 2, 9);
        ctx.fillRect(72, 15, 3, 7);
      }

      // brows (level → angled worry)
      ctx.fillStyle = "#2a2119";
      if (ph >= 2) {
        ctx.save(); ctx.translate(48, 42); ctx.rotate(0.22);
        ctx.fillRect(-6, 0, 12, 3); ctx.restore();
        ctx.save(); ctx.translate(72, 42); ctx.rotate(-0.22);
        ctx.fillRect(-6, 0, 12, 3); ctx.restore();
      } else {
        ctx.fillRect(42, 41, 12, 3);
        ctx.fillRect(66, 41, 12, 3);
      }

      // eyes (blink every ~3.4s; bloodshot at the end)
      const blink = (t % 3.4) < 0.14;
      const eyeWhite = final_ ? "#e8c9c4" : "#f2efe8";
      for (const ex of [44, 68]) {
        if (blink) {
          ctx.fillStyle = shade;
          ctx.fillRect(ex, 48, 10, 2);
        } else {
          ctx.fillStyle = eyeWhite;
          ctx.fillRect(ex, 46, 10, 6);
          ctx.fillStyle = "#31404e";
          ctx.fillRect(ex + 3, 47, 4, 5);          // iris
          ctx.fillStyle = "#10161c";
          ctx.fillRect(ex + 4, 48, 2, 3);          // pupil
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillRect(ex + 4, 47, 1, 1);          // catchlight
          if (final_) {
            ctx.fillStyle = "rgba(190,60,50,0.5)"; // bloodshot corners
            ctx.fillRect(ex, 50, 2, 2);
            ctx.fillRect(ex + 8, 50, 2, 2);
          }
        }
      }
      // eye bags when exhausted
      if (grim) {
        ctx.fillStyle = "rgba(90,60,60,0.45)";
        ctx.fillRect(44, 53, 10, 2);
        ctx.fillRect(68, 53, 10, 2);
      }

      // nose
      ctx.fillStyle = shade;
      ctx.fillRect(58, 50, 4, 10);
      ctx.fillRect(56, 58, 8, 3);

      // the anchor's mustache (slum channel)
      if (slum) {
        ctx.fillStyle = "#141008";
        ctx.fillRect(51, 61, 18, 4);
      }
      // mouth — talking animation
      const talking = !blink;
      const open = talking ? 2 + Math.abs(Math.sin(t * 7)) * 4 : 2;
      ctx.fillStyle = "#5a2a26";
      ctx.fillRect(52, 65, 16, open);
      ctx.fillStyle = "#3a1a18";
      ctx.fillRect(54, 66, 12, Math.max(1, open - 3));

      // stubble at the end of the world
      if (final_) {
        ctx.fillStyle = "rgba(58,46,36,0.5)";
        for (let i = 0; i < 22; i++) {
          const sx2 = 42 + ((i * 17) % 36);
          const sy2 = 64 + ((i * 7) % 10);
          ctx.fillRect(sx2, sy2, 1, 1);
        }
      }

      // sweat drop sliding down the temple
      if (grim) {
        const sy = 38 + ((t * 14) % 30);
        ctx.fillStyle = "rgba(190,220,240,0.8)";
        ctx.fillRect(79, sy, 2, 3);
      }

      // scanline shimmer over the feed (the cheap TV is much worse)
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, (t * 34) % H, W, 2);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
      if (slum) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(0, (t * 61) % H, W, 1);
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.3)";
          ctx.fillRect(Math.random() * W, Math.random() * H, 2, 1);
        }
      }
    },

    /* ================= COMPUTER HUB ================= */
    openComputer(game) {
      const slum = game.zoneId === "slum";
      const pc = this.el.computer.querySelector(".pc");
      pc.classList.toggle("cheap", slum);
      const user = this.el.computer.querySelector(".pc-user");
      if (user) user.textContent = slum ? "◉ chotu-phone" : "◉ home-desktop";
      // the cheap phone gets Messages, Radio, Map, Alerts — and the
      // Newspaper only once Chotu has physically delivered one
      const slumApps = ["messages", "radio", "map", "alerts"];
      if (game.papersHave > 0) slumApps.push("news");
      document.querySelectorAll(".tile").forEach((tile) => {
        const app = tile.dataset.app;
        const hidden = slum ? slumApps.indexOf(app) === -1 : app === "radio";
        tile.classList.toggle("hidden", hidden);
      });
      this.showPcHome();
      this.updateBadges(game);
      this.el.pcClock.textContent = "DAY " + game.day + " · " + game.clockString();
      const off = game.nationalPhase >= 4;
      this.el.pcNet.textContent = slum
        ? (off ? "● NO SIGNAL" : "● 2G, BARELY")
        : (off ? "● DEGRADED" : "● ONLINE");
      this.el.pcNet.classList.toggle("offline", off);
      this.el.computer.classList.remove("hidden");
    },
    closeComputer() { this.el.computer.classList.add("hidden"); },

    showPcHome() {
      this.activeApp = null;
      this.el.pcApp.classList.add("hidden");
      this.el.pcHome.classList.remove("hidden");
      const game = ZH.Engine.game;
      if (game) this.updateBadges(game);
    },

    updateBadges(game) {
      for (const app in game.unread) {
        const el = document.getElementById("badge-" + app);
        if (!el) continue;
        const n = game.unread[app];
        el.classList.toggle("hidden", !n);
        el.textContent = n > 9 ? "9+" : String(n);
      }
    },

    openApp(game, app) {
      this.activeApp = app;
      game.unread[app] = 0;
      this.el.pcHome.classList.add("hidden");
      this.el.pcApp.classList.remove("hidden");
      this.el.pcAppTitle.textContent = APP_TITLES[app] || app.toUpperCase();
      const body = this.el.pcAppBody;
      body.innerHTML = "";
      switch (app) {
        case "messages": this.renderMessages(game); break;
        case "news": this.renderNews(game); break;
        case "map": this.renderMap(game); break;
        case "virus": this.renderVirus(game); break;
        case "alerts": this.renderAlerts(game); break;
        case "social": this.renderSocial(game); break;
        case "radio": this.renderRadio(game); break;
      }
      ZH.Audio.blip();
    },

    /* ---- Messages: threads + typed replies ---- */
    renderMessages(game) {
      const body = this.el.pcAppBody;
      body.innerHTML = "";
      const contacts = (game.contactsRef || ZH.Content.MESSAGES).filter((c) =>
        (game.threads[c.id] || []).length > 0);
      if (!contacts.length) {
        body.innerHTML = "<p>No messages yet. A quiet night — enjoy it while it lasts.</p>";
        return;
      }
      if (!this.activeContact || !contacts.some((c) => c.id === this.activeContact)) {
        this.activeContact = contacts[0].id;
      }

      // contact tabs
      const tabs = document.createElement("div");
      tabs.className = "chat-tabs";
      for (const c of contacts) {
        const b = document.createElement("button");
        b.className = "chat-tab" + (c.id === this.activeContact ? " active" : "");
        b.textContent = c.from;
        if (game.threadUnread[c.id]) {
          const d = document.createElement("span");
          d.className = "dot";
          b.appendChild(d);
        }
        b.addEventListener("click", () => {
          this.activeContact = c.id;
          game.threadUnread[c.id] = 0;
          this.renderMessages(game);
        });
        tabs.appendChild(b);
      }
      body.appendChild(tabs);
      game.threadUnread[this.activeContact] = 0;

      // thread
      const thread = document.createElement("div");
      thread.className = "chat-thread";
      for (const m of (game.threads[this.activeContact] || [])) {
        const div = document.createElement("div");
        div.className = "chat-msg " + m.who;
        div.textContent = m.text;
        thread.appendChild(div);
      }
      body.appendChild(thread);

      // compose row
      const compose = document.createElement("div");
      compose.className = "chat-compose";
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 120;
      input.placeholder = "Type a reply…";
      const send = document.createElement("button");
      send.className = "btn small";
      send.textContent = "SEND";
      const doSend = () => {
        const txt = input.value.trim();
        if (!txt) return;
        input.value = "";
        ZH.Engine.sendMessage(this.activeContact, txt);
      };
      send.addEventListener("click", doSend);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { doSend(); e.preventDefault(); }
        e.stopPropagation(); // typing must never move the player
      });
      compose.appendChild(input);
      compose.appendChild(send);
      body.appendChild(compose);

      // quick replies for one-click answers
      const quick = document.createElement("div");
      quick.className = "quick-replies";
      for (const q of ["I'm okay.", "Are you safe?", "Stay inside. Lock everything.", "I love you."]) {
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = q;
        b.addEventListener("click", () => ZH.Engine.sendMessage(this.activeContact, q));
        quick.appendChild(b);
      }
      body.appendChild(quick);

      body.scrollTop = body.scrollHeight;
    },

    /* ---- Newspapers ---- */
    renderNews(game) {
      const body = this.el.pcAppBody;
      if (game.zoneId === "slum") {
        const have = ZH.Content.SLUM_NEWSPAPERS
          .filter((n) => n.phase <= game.nationalPhase)
          .slice(0, Math.max(0, game.papersHave));
        if (!have.length) {
          body.innerHTML = "<p>No papers yet. Chotu runs them lane to lane — feed the runner, get the news.</p>";
          return;
        }
        for (let i = have.length - 1; i >= 0; i--) {
          const n = have[i];
          const div = document.createElement("div");
          div.className = "newspaper" + (n.phase >= 3 ? " grim" : "");
          div.innerHTML =
            '<div class="np-mast">' + n.paper + "</div>" +
            '<div class="np-date">' + n.date + " · hand-delivered</div>" +
            '<div class="np-head">' + n.head + "</div>" +
            '<div class="np-by">' + n.byline + "</div>" +
            '<div class="np-body">' + n.body + "</div>";
          body.appendChild(div);
        }
        return;
      }
      const issues = [];
      for (let p = 0; p <= game.nationalPhase; p++) {
        for (const n of (ZH.Content.NEWSPAPERS[p] || [])) issues.push({ p, n });
      }
      if (!issues.length) {
        body.innerHTML = "<p>No editions delivered yet.</p>";
        return;
      }
      issues.reverse(); // newest first
      for (const { p, n } of issues) {
        const div = document.createElement("div");
        div.className = "newspaper" + (p >= 4 ? " grim" : "");
        div.innerHTML =
          '<div class="np-mast">' + n.paper + "</div>" +
          '<div class="np-date">' + n.date + " · DAY " + Math.min(game.day, 3) + "</div>" +
          '<div class="np-head">' + n.head + "</div>" +
          '<div class="np-by">' + n.byline + "</div>" +
          '<div class="np-body">' + n.body + "</div>";
        body.appendChild(div);
      }
    },

    /* ---- National map ---- */
    renderMap(game) {
      const body = this.el.pcAppBody;
      const wrap = document.createElement("div");
      wrap.className = "map-wrap";
      const canvas = document.createElement("canvas");
      canvas.id = "map-canvas";
      canvas.width = 520;
      canvas.height = 400;
      wrap.appendChild(canvas);
      body.appendChild(wrap);
      const note = document.createElement("div");
      note.className = "map-note";
      const notes = game.zoneId === "slum" ? [
        "All wards reporting normally.",
        "Port wards under health watch.",
        "Southern wards sealing. Stay in your lane.",
        "The cordon is up. Your ward is marked HOLDING.",
        "The water is winning. Hold, and the map stays blue where you are.",
      ] : [
        "All regions reporting normally.",
        "Coastal counties under observation.",
        "Quarantine lines forming along the seaboard.",
        "Safe-Guarded cities marked in green. Travel is not advised.",
        "Gray Zones are sealed behind the wall. This map will not update again.",
      ];
      note.textContent = notes[game.nationalPhase];
      body.appendChild(note);
      ZH.World.drawMap(canvas.getContext("2d"), canvas.width, canvas.height, game);
    },

    /* ---- Virus reports ---- */
    renderVirus(game) {
      const body = this.el.pcAppBody;
      const icon = document.createElement("div");
      icon.className = "virus-icon";
      icon.textContent = "🦠";
      body.appendChild(icon);
      for (let p = game.nationalPhase; p >= 0; p--) {
        for (const r of (ZH.Content.VIRUS_REPORTS[p] || [])) {
          const div = document.createElement("div");
          div.className = "virus-report";
          div.innerHTML = "<h3>" + r.title + "</h3><p>" + r.body + "</p>";
          body.appendChild(div);
        }
      }
    },

    /* ---- FM radio: the battery set that outlives the grid ---- */
    renderRadio(game) {
      const body = this.el.pcAppBody;
      const head = document.createElement("div");
      head.className = "radio-head";
      head.innerHTML = "📻 <b>GALLI RADIO — FM 92.7</b><br>" +
        "<span class='radio-sub'>battery set · works even when the grid dies</span>";
      body.appendChild(head);
      const items = [];
      for (let p = game.nationalPhase; p >= 0; p--) {
        for (const r of (ZH.Content.SLUM_RADIO[p] || [])) items.push(r);
      }
      if (!items.length) {
        body.innerHTML += "<p>Static, film songs, and the rooster. A normal morning.</p>";
        return;
      }
      for (const r of items) {
        const div = document.createElement("div");
        div.className = "radio-entry";
        div.innerHTML = "<span class='lvl'>[" + r.time + "]</span> " + r.text;
        body.appendChild(div);
      }
    },

    /* ---- Emergency alerts ---- */
    renderAlerts(game) {
      const body = this.el.pcAppBody;
      if (!game.computerAlerts.length) {
        body.innerHTML = "<p>No active alerts. All systems nominal.</p>";
        return;
      }
      for (let i = game.computerAlerts.length - 1; i >= 0; i--) {
        const a = game.computerAlerts[i];
        const div = document.createElement("div");
        div.className = "alert-entry" + (a.level === "CRITICAL" ? " critical" : "");
        div.innerHTML = '<span class="lvl">[' + a.level + "]</span> " + a.text;
        body.appendChild(div);
      }
    },

    /* ---- Social feed ---- */
    renderSocial(game) {
      const body = this.el.pcAppBody;
      const posts = ZH.Content.SOCIAL.filter((p) => p.phase <= game.nationalPhase);
      if (!posts.length) {
        body.innerHTML = "<p>Feed is quiet.</p>";
        return;
      }
      for (let i = posts.length - 1; i >= 0; i--) {
        const p = posts[i];
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML =
          '<span class="post-user">' + p.user + '</span>' +
          '<span class="post-handle">' + p.handle + "</span>" +
          '<div class="post-text">' + p.text + "</div>";
        body.appendChild(div);
      }
    },

    /** Re-render the active messages thread (called after replies land). */
    refreshMessagesIfOpen(game) {
      if (this.activeApp === "messages" &&
          !this.el.computer.classList.contains("hidden")) {
        this.renderMessages(game);
      }
    },

    /* ---------------- First-person window ---------------- */
    openLookout(game, caption) {
      const el = document.getElementById("screen-lookout");
      const cap = document.getElementById("lookout-caption");
      cap.textContent = caption || "";
      el.classList.remove("hidden");
      this.tickLookout(game);
    },
    tickLookout(game) {
      const canvas = document.getElementById("lookout-canvas");
      if (!canvas) return;
      ZH.Renderer.drawLookout(canvas.getContext("2d"), canvas.width, canvas.height, game);
    },
    closeLookout() {
      document.getElementById("screen-lookout").classList.add("hidden");
    },

    /* ---------------- First-person SLEEP / WAKE ---------------- */
    openSleep(game) {
      const el = document.getElementById("screen-sleep");
      el.classList.remove("hidden");
      this.tickSleep(game, 0, false);
    },
    tickSleep(game, k, waking) {
      const canvas = document.getElementById("sleep-canvas");
      if (!canvas) return;
      ZH.Renderer.drawSleep(canvas.getContext("2d"), canvas.width, canvas.height, game, k, waking);
    },
    closeSleep() {
      document.getElementById("screen-sleep").classList.add("hidden");
    },

    /* ---------------- Door modal (knock decision OR free peek) ---------------- */
    openDoor(game, visitor, peek) {
      this.el.doorTitle.textContent = visitor.title;
      this.el.doorDesc.textContent = visitor.desc;
      const yes = document.getElementById("door-yes");
      const no = document.getElementById("door-no");
      const back = document.getElementById("door-back");
      yes.textContent = visitor.yesLabel || "OPEN THE DOOR";
      no.textContent = visitor.noLabel || "KEEP IT SHUT";
      yes.classList.toggle("hidden", !!peek);
      no.classList.toggle("hidden", !!peek);
      back.classList.toggle("hidden", !peek);
      // choice cards have no countdown — only real knocks do
      const noTimer = !!peek || !!visitor.yesLabel;
      this.el.doorTimer.classList.toggle("hidden", noTimer);
      this.el.doorTimer.innerHTML = '<div id="door-timer-bar"></div>';
      this.doorBar = document.getElementById("door-timer-bar");
      ZH.Renderer.drawPeephole(this.peepCtx, visitor, game);
      this.el.doorModal.classList.remove("hidden");
    },
    updateDoorPeephole(game, visitor) {
      if (this.el.doorModal.classList.contains("hidden")) return;
      ZH.Renderer.drawPeephole(this.peepCtx, visitor, game);
    },
    updateDoorTimer(frac) {
      if (this.doorBar) this.doorBar.style.width = Math.max(0, frac * 100) + "%";
    },
    closeDoor() { this.el.doorModal.classList.add("hidden"); },

    /* ---------------- overlays ---------------- */
    hideMenu() { this.el.menu.classList.add("hidden"); },
    showMenu() { this.el.menu.classList.remove("hidden"); },

    showEnding(game, endingId) {
      const e = ZH.Content.ENDINGS[endingId];
      const card = this.el.ending.querySelector(".ending-card");
      card.className = "ending-card " + (e.mood || "");
      this.el.endingTitle.textContent = e.title;
      this.el.endingText.textContent = e.text;
      const mm = String(Math.floor(game.timeElapsed / 60)).padStart(2, "0");
      const ss = String(Math.floor(game.timeElapsed % 60)).padStart(2, "0");
      this.el.endingStats.innerHTML =
        (game.stateName ? "Location: " + game.stateName + " · " + game.area.label +
          " · " + game.zone.label + "<br>" : "") +
        "<b>Days survived: " + game.day + "</b> (until " + game.clockString() + ")<br>" +
        "Real time: " + mm + ":" + ss + "<br>" +
        "Final stress: " + Math.round(game.player.stress) + "%<br>" +
        "Doors answered: " + game.stats.doorsAnswered +
        " &nbsp;·&nbsp; Opened: " + game.stats.doorsOpened + "<br>" +
        "Barricades built: " + game.stats.barricadesBuilt +
        " &nbsp;·&nbsp; Coffee: " + game.stats.coffee +
        " &nbsp;·&nbsp; Meals cooked: " + game.stats.meals;
      this.el.ending.classList.remove("hidden");
    },
    hideEnding() { this.el.ending.classList.add("hidden"); },

    setMuteIcon(muted) { this.el.mute.textContent = muted ? "🔇" : "🔊"; },
  };

  ZH.UI = UI;
})(window.ZH = window.ZH || {});
