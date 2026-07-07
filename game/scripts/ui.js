/* ============================================================
   ui.js — DOM view layer
   Renders the HUD, the TV / computer / phone screens, the door
   modal, toasts and the menu / ending overlays. The engine owns
   the logic and input; this module only reflects state into the DOM.
   Exposes: window.ZH.UI
   ============================================================ */
(function (ZH) {
  "use strict";

  const UI = {
    el: {},
    toasts: [],
    toastTimer: 0,

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
        // computer
        computer: $("screen-computer"),
        computerLog: $("computer-log"),
        // phone
        phone: $("screen-phone"),
        phoneLog: $("phone-log"),
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
      // toast container
      const tc = document.createElement("div");
      tc.id = "toast-container";
      tc.style.cssText =
        "position:absolute;left:50%;bottom:14%;transform:translateX(-50%);" +
        "z-index:30;display:flex;flex-direction:column;gap:6px;align-items:center;" +
        "pointer-events:none;max-width:80%;";
      document.getElementById("game-frame").appendChild(tc);
      this.el.toastContainer = tc;
      this.peepCtx = this.el.peephole.getContext("2d");
    },

    /* ---------------- HUD ---------------- */
    refreshHUD(game) {
      this.el.clock.textContent = game.clockString();
      this.el.dayChip.textContent = "DAY " + game.day + "/3";
      if (game.zone) {
        this.el.locChip.textContent = game.stateName + " · " + game.area.label;
        this.el.locChip.style.borderLeftColor = game.zone.color;
      }
      this.el.phase.textContent = "SITUATION: " + ZH.Content.PHASES[game.phase];
      this.el.phase.style.color =
        game.phase >= 3 ? "#d0473e" : game.phase >= 2 ? "#e0a83c" : "#7ec36b";

      if (game.orderIndex > 0) {
        this.el.order.classList.remove("hidden");
        this.el.order.textContent = "⚠ " + ZH.Content.ORDERS[game.orderIndex];
      } else {
        this.el.order.classList.add("hidden");
      }

      this.el.stress.style.width = game.player.stress + "%";
      this.el.fatigue.style.width = game.player.fatigue + "%";

      const b = game.barricades;
      const bar = (n) => "▮".repeat(n) + "▯".repeat(3 - n);
      this.el.barricade.innerHTML =
        "DOOR <b>" + bar(b.door) + "</b>&nbsp;&nbsp;WINDOWS <b>" + bar(b.window) + "</b>";
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
      // cap on-screen toasts
      while (this.el.toastContainer.children.length > 4) {
        this.el.toastContainer.firstChild.remove();
      }
    },
    clearToasts() {
      if (this.el.toastContainer) this.el.toastContainer.innerHTML = "";
    },

    /* ---------------- TV ---------------- */
    openTV(game) {
      this.renderTV(game);
      this.el.tv.classList.remove("hidden");
    },
    closeTV() { this.el.tv.classList.add("hidden"); },
    renderTV(game) {
      const TL = ZH.Content.TV_TIMELINE;
      const idx = Math.max(0, Math.min(game.tvView, TL.length - 1));
      const item = TL[idx];
      const live = idx === game.tvStage;

      this.el.tvChannel.textContent = item.channel + "  ·  SEG " + item.id;
      this.el.tvHeadline.textContent = item.headline || "";
      this.el.tvBody.textContent = item.body || "";
      this.el.tvTicker.textContent = item.ticker ? item.ticker + "  ·  " : "";

      if (this.el.tvLive) {
        if (live) {
          this.el.tvLive.textContent = "● LIVE";
          this.el.tvLive.classList.remove("replay");
        } else {
          this.el.tvLive.textContent = "◄ REPLAY " + (idx + 1) + "/" + (game.tvStage + 1);
          this.el.tvLive.classList.add("replay");
        }
      }
      // dead-air / emergency segment styling
      if (this.el.tvInner) {
        this.el.tvInner.classList.remove("static", "emergency", "black");
        if (item.special) this.el.tvInner.classList.add(item.special);
      }
    },

    /* ---------------- Computer ---------------- */
    openComputer(game) {
      this.renderComputer(game);
      this.el.computer.classList.remove("hidden");
    },
    closeComputer() { this.el.computer.classList.add("hidden"); },
    renderComputer(game) {
      const log = this.el.computerLog;
      log.innerHTML = "";
      if (!game.computerAlerts.length) {
        log.innerHTML = '<div class="entry"><span class="lvl">SYSTEM</span> — No active alerts. All systems nominal.</div>';
      }
      for (const a of game.computerAlerts) {
        const div = document.createElement("div");
        div.className = "entry" + (a.level === "CRITICAL" ? " critical" : "");
        div.innerHTML = '<span class="lvl">[' + a.level + ']</span> ' + a.text;
        log.appendChild(div);
      }
      log.scrollTop = log.scrollHeight;
    },

    /* ---------------- Phone ---------------- */
    openPhone(game) {
      this.renderPhone(game);
      this.el.phone.classList.remove("hidden");
    },
    closePhone() { this.el.phone.classList.add("hidden"); },
    renderPhone(game) {
      const log = this.el.phoneLog;
      log.innerHTML = "";
      if (!game.phoneMsgs.length) {
        log.innerHTML = '<div class="phone-msg"><span class="from">System</span>No messages.</div>';
      }
      for (const m of game.phoneMsgs) {
        const div = document.createElement("div");
        div.className = "phone-msg" + (m.gov ? " gov" : "");
        div.innerHTML = '<span class="from">' + m.from + "</span>" + m.text;
        log.appendChild(div);
      }
      log.scrollTop = log.scrollHeight;
    },

    /* ---------------- Door modal ---------------- */
    openDoor(game, visitor) {
      this.el.doorTitle.textContent = visitor.title;
      this.el.doorDesc.textContent = visitor.desc;
      this.el.doorTimer.innerHTML = '<div id="door-timer-bar"></div>';
      this.doorBar = document.getElementById("door-timer-bar");
      ZH.Renderer.drawPeephole(this.peepCtx, visitor, game);
      this.el.doorModal.classList.remove("hidden");
    },
    // keep the peephole animated (twitching infected etc.)
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
        "You held out until <b>DAY " + game.day + " · " + game.clockString() + "</b><br>" +
        "Time survived: " + mm + ":" + ss + "<br>" +
        "Final stress: " + Math.round(game.player.stress) + "%<br>" +
        "Doors answered: " + game.stats.doorsAnswered +
        " &nbsp;·&nbsp; Opened: " + game.stats.doorsOpened + "<br>" +
        "Barricades built: " + game.stats.barricadesBuilt +
        " &nbsp;·&nbsp; Cups of coffee: " + game.stats.coffee;
      this.el.ending.classList.remove("hidden");
    },
    hideEnding() { this.el.ending.classList.add("hidden"); },

    setMuteIcon(muted) { this.el.mute.textContent = muted ? "🔇" : "🔊"; },
  };

  ZH.UI = UI;
})(window.ZH = window.ZH || {});
