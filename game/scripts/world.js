/* ============================================================
   world.js — the national Peclip situation map
   Zone tiers, every state's tier + geographic block position,
   spawn areas, the menu location picker, and drawMap() which
   paints a real-shaped USA out of state blocks (with AK/HI
   insets) that darkens as the national phase advances.

   PACING MODEL: every zone starts at a perfectly normal Day 1.
   A zone's `speed` controls how fast the national collapse
   reaches YOUR street:  local = floor(national × speed).
   Gray zones fall days earlier; Green fortresses never fully
   fall at all.
   Exposes: window.ZH.World
   ============================================================ */
(function (ZH) {
  "use strict";

  const ZONES = {
    green: {
      label: "GREEN SAFE ZONE", color: "#2e7d6b", speed: 0.7,
      knockMul: 1.6, horrorMul: 1.5, breachMul: 0.25,
      desc: "Fortified and functioning. The collapse arrives late here, and never completely.",
    },
    yellow: {
      label: "STRAINED ZONE", color: "#e0c23c", speed: 1.0,
      knockMul: 1.0, horrorMul: 1.0, breachMul: 1.0,
      desc: "The outbreak reaches you on the national schedule. Rationing, curfews, sporadic incidents.",
    },
    orange: {
      label: "FRONTLINE ZONE", color: "#d0812c", speed: 1.2,
      knockMul: 0.85, horrorMul: 0.8, breachMul: 1.3,
      desc: "Trouble runs a day or two ahead of the news here. The line is close and getting closer.",
    },
    red: {
      label: "OVERRUN ZONE", color: "#c05038", speed: 1.4,
      knockMul: 0.7, horrorMul: 0.65, breachMul: 1.6,
      desc: "Everything happens early and hard. Emergency services will collapse days before the broadcasts admit it.",
    },
    darkred: {
      label: "COLLAPSED ZONE", color: "#8a1a1e", speed: 1.6,
      knockMul: 0.6, horrorMul: 0.55, breachMul: 2.0,
      desc: "The eastern seaboard. It falls first, it falls fastest, and no evacuation route stays open for long.",
    },
    gray: {
      label: "GRAY ZONE — UNRECOVERABLE", color: "#6b7076", speed: 1.85,
      knockMul: 0.55, horrorMul: 0.5, breachMul: 2.2,
      desc: "Ground zero regions. Days ahead of the country: government gone early, militias and gangs holding the blocks.",
    },
  };

  /* Zone tier follows the national situation map.
     m: [x, y, w, h] geographic block on a 100×64 map space
     (null for special locations that aren't a whole state). */
  const STATES = [
    // ---- GREEN SAFE ZONES ----
    { id: "NYC", name: "New York City — Fortress", zone: "green", m: null },
    { id: "WA", name: "Washington", zone: "green", m: [5, 3, 9, 7] },
    { id: "ID", name: "Idaho", zone: "green", m: [15, 7, 7, 12] },
    { id: "MT", name: "Montana", zone: "green", m: [23, 3, 14, 8] },
    { id: "WY", name: "Wyoming", zone: "green", m: [23, 12, 12, 7] },
    { id: "ND", name: "North Dakota", zone: "green", m: [38, 3, 10, 7] },
    { id: "SD", name: "South Dakota", zone: "green", m: [38, 11, 10, 7] },
    { id: "NE", name: "Nebraska", zone: "green", m: [36, 19, 12, 6] },
    { id: "MN", name: "Minnesota", zone: "green", m: [49, 3, 9, 9] },
    { id: "IA", name: "Iowa", zone: "green", m: [49, 13, 9, 6] },
    { id: "WI", name: "Wisconsin", zone: "green", m: [59, 5, 7, 8] },
    { id: "MI", name: "Michigan", zone: "green", m: [67, 4, 8, 9] },
    { id: "AK", name: "Alaska", zone: "green", m: [3, 46, 13, 10], inset: "ALASKA" },
    { id: "HI", name: "Hawaii", zone: "green", m: [19, 52, 9, 4], inset: "HAWAII" },
    // ---- STRAINED ----
    { id: "UT", name: "Utah", zone: "yellow", m: [20, 20, 8, 10] },
    { id: "CO", name: "Colorado", zone: "yellow", m: [29, 20, 11, 9] },
    { id: "KS", name: "Kansas", zone: "yellow", m: [38, 26, 12, 6] },
    { id: "MO", name: "Missouri", zone: "yellow", m: [50, 20, 9, 9] },
    { id: "IL", name: "Illinois", zone: "yellow", m: [59, 14, 6, 10] },
    { id: "OK", name: "Oklahoma", zone: "yellow", m: [39, 33, 12, 6] },
    { id: "AR", name: "Arkansas", zone: "yellow", m: [52, 30, 8, 7] },
    { id: "LA", name: "Louisiana", zone: "yellow", m: [52, 38, 8, 8] },
    { id: "MS", name: "Mississippi", zone: "yellow", m: [61, 34, 6, 10] },
    { id: "AL", name: "Alabama", zone: "yellow", m: [68, 34, 6, 10] },
    { id: "GA", name: "Georgia", zone: "yellow", m: [75, 34, 8, 9] },
    { id: "SC", name: "South Carolina", zone: "yellow", m: [80, 29, 8, 4] },
    { id: "NC", name: "North Carolina", zone: "yellow", m: [75, 25, 14, 4] },
    { id: "FL", name: "Florida", zone: "yellow", m: [77, 44, 13, 6] },
    // ---- FRONTLINE ----
    { id: "AZ", name: "Arizona", zone: "orange", m: [13, 33, 10, 11] },
    { id: "NM", name: "New Mexico", zone: "orange", m: [24, 33, 10, 11] },
    // ---- OVERRUN ----
    { id: "TX", name: "Texas", zone: "red", m: [34, 40, 17, 14] },
    { id: "IN", name: "Indiana", zone: "red", m: [66, 15, 5, 8] },
    { id: "OH", name: "Ohio", zone: "red", m: [72, 14, 6, 7] },
    { id: "KY", name: "Kentucky", zone: "red", m: [65, 24, 11, 4] },
    { id: "WV", name: "West Virginia", zone: "red", m: [73, 21, 5, 4] },
    { id: "TN", name: "Tennessee", zone: "red", m: [63, 29, 13, 4] },
    // ---- COLLAPSED EAST ----
    { id: "ME", name: "Maine", zone: "darkred", m: [92, 0, 6, 9] },
    { id: "NH", name: "New Hampshire", zone: "darkred", m: [89, 4, 3, 6] },
    { id: "VT", name: "Vermont", zone: "darkred", m: [86, 4, 3, 6] },
    { id: "MA", name: "Massachusetts", zone: "darkred", m: [87, 10, 8, 3] },
    { id: "RI", name: "Rhode Island", zone: "darkred", m: [92, 13, 3, 3] },
    { id: "CT", name: "Connecticut", zone: "darkred", m: [87, 13, 4, 3] },
    { id: "NY", name: "New York (state)", zone: "darkred", m: [77, 6, 10, 7] },
    { id: "NJ", name: "New Jersey", zone: "darkred", m: [88, 16, 3, 6] },
    { id: "PA", name: "Pennsylvania", zone: "darkred", m: [78, 13, 10, 5] },
    { id: "DE", name: "Delaware", zone: "darkred", m: [91, 22, 2, 4] },
    { id: "MD", name: "Maryland", zone: "darkred", m: [80, 19, 8, 3] },
    { id: "DC", name: "Washington D.C.", zone: "darkred", m: [84, 22, 2, 2] },
    { id: "VA", name: "Virginia", zone: "darkred", m: [78, 22, 10, 4] },
    // ---- GRAY / UNRECOVERABLE ----
    { id: "CA", name: "California (L.A. Mega-Outbreak)", zone: "gray", m: [2, 20, 8, 16] },
    { id: "OR", name: "Oregon", zone: "gray", m: [3, 11, 10, 8] },
    { id: "NV", name: "Nevada", zone: "gray", m: [11, 20, 8, 12] },
    { id: "LI", name: "Long Island — Cut Off", zone: "gray", m: null },
  ];

  const AREAS = {
    city: {
      label: "City Center", home: "apartment", knockMul: 0.75, horrorMul: 0.8,
      desc: "A studio apartment over dense blocks: more people at your door, more noise, more of everything.",
    },
    suburb: {
      label: "Suburbs", home: "house", knockMul: 1.0, horrorMul: 1.0,
      desc: "A family house on a quiet street of lawns and porch lights. The default nightmare.",
    },
    rural: {
      label: "Rural Outskirts", home: "farmhouse", knockMul: 1.4, horrorMul: 1.25,
      desc: "A farmhouse alone among the fields. Fewer visitors — but no one will hear you, either.",
    },
  };

  /* How each tier's map color evolves with the NATIONAL phase 0..4. */
  const STAGE_COLORS = {
    green:   ["#2e7d6b", "#2e7d6b", "#2e7d6b", "#2e7d6b", "#2e7d6b"],
    yellow:  ["#3f7a5a", "#3f7a5a", "#7f8f4a", "#e0c23c", "#e0c23c"],
    orange:  ["#3f7a5a", "#7f8f4a", "#e0c23c", "#d0812c", "#d0812c"],
    red:     ["#3f7a5a", "#e0c23c", "#d0812c", "#c05038", "#c05038"],
    darkred: ["#3f7a5a", "#e0c23c", "#d0812c", "#a03028", "#8a1a1e"],
    gray:    ["#3f7a5a", "#e0c23c", "#c05038", "#6b7076", "#6b7076"],
  };

  const PARTIAL_GRAY = ["WA", "AZ", "NJ"];

  const CITIES = [
    { label: "NYC", x: 87, y: 11 },
    { label: "PHL", x: 88, y: 15 },
    { label: "BAL", x: 84, y: 20 },
    { label: "DC",  x: 85, y: 23 },
  ];

  const World = {
    ZONES, STATES, AREAS,

    byId(id) { return STATES.find((s) => s.id === id) || null; },

    /** Local severity for a zone given the national phase. */
    localPhase(zoneId, nationalPhase) {
      const z = ZONES[zoneId] || ZONES.yellow;
      return Math.max(0, Math.min(4, Math.floor(nationalPhase * z.speed + 1e-6)));
    },

    /** Populate + wire the menu location picker. */
    initPicker(stateSel, areaSel, chipEl, descEl) {
      const order = ["green", "yellow", "orange", "red", "darkred", "gray"];
      for (const z of order) {
        const og = document.createElement("optgroup");
        og.label = ZONES[z].label;
        for (const st of STATES.filter((s) => s.zone === z)) {
          const opt = document.createElement("option");
          opt.value = st.id;
          opt.textContent = st.name;
          og.appendChild(opt);
        }
        stateSel.appendChild(og);
      }
      stateSel.value = "KS";

      const refresh = () => {
        const st = World.byId(stateSel.value) || World.byId("KS");
        const zone = ZONES[st.zone];
        const area = AREAS[areaSel.value] || AREAS.suburb;
        chipEl.textContent = zone.label;
        chipEl.style.background = zone.color;
        descEl.textContent = zone.desc + " " + area.desc;
      };
      stateSel.addEventListener("change", refresh);
      areaSel.addEventListener("change", refresh);
      refresh();
    },

    /* ------------------------------------------------------------
       drawMap — a real-shaped USA built from state blocks, over
       ocean, with AK/HI insets. Darkens as the national phase
       advances; Safe-Guarded cities, partial-gray creep and the
       containment wall appear late. Any canvas size works.
       ------------------------------------------------------------ */
    drawMap(ctx, W, H, game) {
      const phase = Math.max(0, Math.min(4,
        (game && typeof game.nationalPhase === "number") ? game.nationalPhase : 0));
      const day = game && game.day ? game.day : 1;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // ocean
      const oc = ctx.createLinearGradient(0, 0, 0, H);
      oc.addColorStop(0, "#0c1523");
      oc.addColorStop(1, "#0a1019");
      ctx.fillStyle = oc;
      ctx.fillRect(0, 0, W, H);

      const small = W < 200;
      const headH = small ? 9 : 24;
      const legendH = small ? 0 : 20;
      const sx = W / 100;
      const sy = (H - headH - legendH) / 64;
      const S = Math.min(sx, sy);
      const ox = (W - S * 100) / 2;
      const oy = headH;
      const R = (m) => [ox + m[0] * S, oy + m[1] * S, m[2] * S, m[3] * S];

      // faint lat/long lines for map texture
      if (!small) {
        ctx.strokeStyle = "rgba(120,150,190,0.06)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
          ctx.beginPath(); ctx.moveTo(0, oy + i * 10 * S); ctx.lineTo(W, oy + i * 10 * S); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ox + i * 16 * S, 0); ctx.lineTo(ox + i * 16 * S, H); ctx.stroke();
        }
      }

      // title
      ctx.fillStyle = phase >= 3 ? "#ff6f63" : "#9bf0ad";
      ctx.font = (small ? 6 : 11) + "px monospace";
      ctx.textBaseline = "top";
      const titles = [
        "CDC SITUATION MAP — ROUTINE",
        "PECLIP WATCH — COASTAL ALERT",
        "NATIONAL OUTBREAK MAP",
        "COLLAPSE TRACKING — DAY " + day,
        "CONTAINMENT MAP — FINAL",
      ];
      ctx.fillText(titles[phase], Math.max(4, ox), small ? 1 : 5);

      // state blocks
      for (const st of STATES) {
        if (!st.m) continue;
        const [x, y, w, h] = R(st.m);
        ctx.fillStyle = STAGE_COLORS[st.zone][phase];
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "rgba(6,10,16,0.8)";
        ctx.lineWidth = Math.max(1, S * 0.3);
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

        if (phase >= 3 && PARTIAL_GRAY.indexOf(st.id) !== -1) {
          ctx.fillStyle = "#6b7076";
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h);
          ctx.closePath(); ctx.fill();
        }
        if (phase >= 4 && st.zone === "gray") {
          ctx.strokeStyle = "#e8d44d";
          ctx.lineWidth = Math.max(1, S * 0.5);
          ctx.setLineDash([S * 1.2, S * 0.8]);
          ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
          ctx.setLineDash([]);
        }
        // labels on blocks big enough
        if (!small && w > 14 && h > 9) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.font = Math.max(6, Math.floor(S * 2.4)) + "px monospace";
          ctx.fillText(st.id, x + 2, y + 2);
        }
        // inset labels
        if (!small && st.inset) {
          ctx.fillStyle = "#6a7688";
          ctx.font = "6px monospace";
          ctx.fillText(st.inset, x, y + h + 2);
        }
      }

      // inset divider
      if (!small) {
        ctx.strokeStyle = "rgba(120,150,190,0.25)";
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(ox + 1 * S, oy + 44 * S, 30 * S, 15 * S);
        ctx.setLineDash([]);
      }

      // Safe-Guarded cities
      if (phase >= 3) {
        for (const c of CITIES) {
          const cx = ox + c.x * S, cy = oy + c.y * S;
          ctx.fillStyle = "#39d98a";
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, S * 0.9), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#0b0e15";
          ctx.lineWidth = 1;
          ctx.stroke();
          if (!small) {
            ctx.fillStyle = "#39d98a";
            ctx.font = "7px monospace";
            ctx.fillText(c.label, cx + S, cy - S * 0.6);
          }
        }
      }

      // legend
      if (!small) {
        const items = [
          ["#2e7d6b", "SAFE"],
          ["#e0c23c", "STRAINED"],
          ["#d0812c", "FRONTLINE"],
          ["#c05038", "OVERRUN"],
          ["#8a1a1e", "COLLAPSED"],
          ["#6b7076", "GRAY ZONE"],
        ];
        let lx = Math.max(6, ox);
        const ly = H - legendH + 5;
        ctx.font = "7px monospace";
        for (const [col, lab] of items) {
          ctx.fillStyle = col;
          ctx.fillRect(lx, ly, 7, 7);
          ctx.fillStyle = "#8a93a2";
          ctx.fillText(lab, lx + 9, ly);
          lx += 9 + ctx.measureText(lab).width + 10;
        }
        if (phase >= 3) {
          ctx.fillStyle = "#39d98a";
          ctx.beginPath(); ctx.arc(lx + 3, ly + 3, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#8a93a2";
          ctx.fillText("SAFE-GUARDED CITY", lx + 9, ly);
        }
      }
      ctx.restore();
    },
  };

  ZH.World = World;
})(window.ZH = window.ZH || {});
