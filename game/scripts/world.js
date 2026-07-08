/* ============================================================
   world.js — the national Peclip situation map
   Zone tiers, every state's tier + tile-grid position, spawn
   areas, the menu location picker, and drawMap() which paints
   the live national map (used by the computer's MAP app and
   the TV's mini-map). The map evolves with the national phase:
   green protected cities, the eastern collapse, the California
   gray zone, partially-gray border states, and the walls.
   Exposes: window.ZH.World
   ============================================================ */
(function (ZH) {
  "use strict";

  const ZONES = {
    green: {
      label: "GREEN SAFE ZONE", color: "#2e7d6b", offset: -1,
      knockMul: 1.6, horrorMul: 1.5, breachMul: 0.25,
      desc: "Militarized, fortified, functioning. Walls, patrols and curfews keep the infection down to rumors — mostly.",
    },
    yellow: {
      label: "STRAINED ZONE", color: "#e0c23c", offset: 0,
      knockMul: 1.0, horrorMul: 1.0, breachMul: 1.0,
      desc: "Rationing, curfews, sporadic incidents. Holding — for now.",
    },
    orange: {
      label: "FRONTLINE ZONE", color: "#d0812c", offset: 1,
      knockMul: 0.85, horrorMul: 0.8, breachMul: 1.3,
      desc: "Heavy military presence, evacuations underway, incidents every night. The line is close and getting closer.",
    },
    red: {
      label: "OVERRUN ZONE", color: "#c05038", offset: 1,
      knockMul: 0.7, horrorMul: 0.65, breachMul: 1.6,
      desc: "Emergency services have collapsed. The infected move openly after dark.",
    },
    darkred: {
      label: "COLLAPSED ZONE", color: "#8a1a1e", offset: 2,
      knockMul: 0.6, horrorMul: 0.55, breachMul: 2.0,
      desc: "Lost territory behind the containment lines. No evacuation is coming, and the sweeps begin at dawn.",
    },
    gray: {
      label: "GRAY ZONE — UNRECOVERABLE", color: "#6b7076", offset: 2,
      knockMul: 0.55, horrorMul: 0.5, breachMul: 2.2,
      desc: "No government. No rescue. Gangs and militias hold the streets while helicopter strike waves burn the clusters.",
    },
  };

  /* Zone assignment follows the national situation map.
     g: [col, row] tile position on the 11x8 grid cartogram
     (null for special locations that aren't a whole state). */
  const STATES = [
    // ---- GREEN SAFE ZONES ----
    { id: "NYC", name: "New York City — Fortress", zone: "green", g: null },
    { id: "WA", name: "Washington", zone: "green", g: [1, 1] },
    { id: "ID", name: "Idaho", zone: "green", g: [2, 2] },
    { id: "MT", name: "Montana", zone: "green", g: [2, 1] },
    { id: "WY", name: "Wyoming", zone: "green", g: [3, 3] },
    { id: "ND", name: "North Dakota", zone: "green", g: [3, 1] },
    { id: "SD", name: "South Dakota", zone: "green", g: [3, 2] },
    { id: "NE", name: "Nebraska", zone: "green", g: [4, 3] },
    { id: "MN", name: "Minnesota", zone: "green", g: [4, 1] },
    { id: "IA", name: "Iowa", zone: "green", g: [4, 2] },
    { id: "WI", name: "Wisconsin", zone: "green", g: [5, 1] },
    { id: "MI", name: "Michigan", zone: "green", g: [6, 1] },
    { id: "AK", name: "Alaska", zone: "green", g: [0, 0] },
    { id: "HI", name: "Hawaii", zone: "green", g: [0, 7] },
    // ---- STRAINED ----
    { id: "UT", name: "Utah", zone: "yellow", g: [2, 4] },
    { id: "CO", name: "Colorado", zone: "yellow", g: [3, 4] },
    { id: "KS", name: "Kansas", zone: "yellow", g: [4, 4] },
    { id: "MO", name: "Missouri", zone: "yellow", g: [5, 3] },
    { id: "IL", name: "Illinois", zone: "yellow", g: [5, 2] },
    { id: "OK", name: "Oklahoma", zone: "yellow", g: [4, 5] },
    { id: "AR", name: "Arkansas", zone: "yellow", g: [5, 4] },
    { id: "LA", name: "Louisiana", zone: "yellow", g: [5, 5] },
    { id: "MS", name: "Mississippi", zone: "yellow", g: [6, 5] },
    { id: "AL", name: "Alabama", zone: "yellow", g: [6, 6] },
    { id: "GA", name: "Georgia", zone: "yellow", g: [7, 6] },
    { id: "SC", name: "South Carolina", zone: "yellow", g: [8, 5] },
    { id: "NC", name: "North Carolina", zone: "yellow", g: [7, 5] },
    { id: "FL", name: "Florida", zone: "yellow", g: [8, 7] },
    // ---- FRONTLINE ----
    { id: "AZ", name: "Arizona", zone: "orange", g: [2, 5] },
    { id: "NM", name: "New Mexico", zone: "orange", g: [3, 5] },
    // ---- OVERRUN ----
    { id: "TX", name: "Texas", zone: "red", g: [4, 6] },
    { id: "IN", name: "Indiana", zone: "red", g: [6, 2] },
    { id: "OH", name: "Ohio", zone: "red", g: [7, 2] },
    { id: "KY", name: "Kentucky", zone: "red", g: [6, 3] },
    { id: "WV", name: "West Virginia", zone: "red", g: [7, 3] },
    { id: "TN", name: "Tennessee", zone: "red", g: [6, 4] },
    // ---- COLLAPSED EAST ----
    { id: "ME", name: "Maine", zone: "darkred", g: [10, 0] },
    { id: "NH", name: "New Hampshire", zone: "darkred", g: [10, 1] },
    { id: "VT", name: "Vermont", zone: "darkred", g: [9, 1] },
    { id: "MA", name: "Massachusetts", zone: "darkred", g: [10, 2] },
    { id: "RI", name: "Rhode Island", zone: "darkred", g: [10, 4] },
    { id: "CT", name: "Connecticut", zone: "darkred", g: [10, 3] },
    { id: "NY", name: "New York (state)", zone: "darkred", g: [9, 2] },
    { id: "NJ", name: "New Jersey", zone: "darkred", g: [9, 3] },
    { id: "PA", name: "Pennsylvania", zone: "darkred", g: [8, 2] },
    { id: "DE", name: "Delaware", zone: "darkred", g: [8, 4] },
    { id: "MD", name: "Maryland", zone: "darkred", g: [8, 3] },
    { id: "DC", name: "Washington D.C.", zone: "darkred", g: [9, 4] },
    { id: "VA", name: "Virginia", zone: "darkred", g: [7, 4] },
    // ---- GRAY / UNRECOVERABLE ----
    { id: "CA", name: "California (L.A. Mega-Outbreak)", zone: "gray", g: [1, 3] },
    { id: "OR", name: "Oregon", zone: "gray", g: [1, 2] },
    { id: "NV", name: "Nevada", zone: "gray", g: [2, 3] },
    { id: "LI", name: "Long Island — Cut Off", zone: "gray", g: null },
  ];

  const AREAS = {
    city: {
      label: "City Center", knockMul: 0.75, horrorMul: 0.8,
      desc: "Dense blocks: more people at your door, more noise, more of everything.",
    },
    suburb: {
      label: "Suburbs", knockMul: 1.0, horrorMul: 1.0,
      desc: "Your quiet street. The default nightmare.",
    },
    rural: {
      label: "Rural Outskirts", knockMul: 1.4, horrorMul: 1.25,
      desc: "Isolated. Fewer visitors — but no one will hear you, either.",
    },
  };

  /* How each tier's tile color evolves with the NATIONAL phase 0..4. */
  const STAGE_COLORS = {
    green:   ["#2e7d6b", "#2e7d6b", "#2e7d6b", "#2e7d6b", "#2e7d6b"],
    yellow:  ["#3f7a5a", "#3f7a5a", "#7f8f4a", "#e0c23c", "#e0c23c"],
    orange:  ["#3f7a5a", "#7f8f4a", "#e0c23c", "#d0812c", "#d0812c"],
    red:     ["#3f7a5a", "#e0c23c", "#d0812c", "#c05038", "#c05038"],
    darkred: ["#3f7a5a", "#e0c23c", "#d0812c", "#a03028", "#8a1a1e"],
    gray:    ["#3f7a5a", "#e0c23c", "#c05038", "#6b7076", "#6b7076"],
  };

  // States that go PARTIALLY gray next to the gray zones (coastal WA,
  // western AZ, northern NJ) once the collapse is advanced.
  const PARTIAL_GRAY = ["WA", "AZ", "NJ"];

  // The four Safe-Guarded cities and the tiles they sit on.
  const CITIES = [
    { label: "NYC", tile: "NY" },
    { label: "DC",  tile: "DC" },
    { label: "PHL", tile: "PA" },
    { label: "BAL", tile: "MD" },
  ];

  const World = {
    ZONES, STATES, AREAS,

    byId(id) { return STATES.find((s) => s.id === id) || null; },

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
       drawMap — paint the live national situation map.
       Renders a tile-grid cartogram of the US that darkens as the
       national phase advances. Used by the computer MAP app and
       the TV mini-map (any canvas size works).
       ------------------------------------------------------------ */
    drawMap(ctx, W, H, game) {
      const phase = Math.max(0, Math.min(4,
        (game && typeof game.nationalPhase === "number") ? game.nationalPhase : 0));
      const day = game && game.day ? game.day : 1;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // background
      ctx.fillStyle = "#0b0e15";
      ctx.fillRect(0, 0, W, H);

      const small = W < 200; // TV mini-map mode
      const headH = small ? 10 : 26;
      const legendH = small ? 0 : 22;
      const tile = Math.floor(Math.min(W / 11.6, (H - headH - legendH) / 8.4));
      const ox = Math.floor((W - tile * 11) / 2);
      const oy = headH + Math.floor((H - headH - legendH - tile * 8) / 2);

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
      ctx.fillText(titles[phase], ox, small ? 1 : 6);

      // state tiles
      for (const st of STATES) {
        if (!st.g) continue;
        const x = ox + st.g[0] * tile;
        const y = oy + st.g[1] * tile;
        const w = tile - 2, h = tile - 2;
        ctx.fillStyle = STAGE_COLORS[st.zone][phase];
        ctx.fillRect(x, y, w, h);

        // partial gray creep on the borders of the gray zones
        if (phase >= 3 && PARTIAL_GRAY.indexOf(st.id) !== -1) {
          ctx.fillStyle = "#6b7076";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x, y + h);
          ctx.closePath();
          ctx.fill();
        }

        // containment wall around the gray zones
        if (phase >= 4 && st.zone === "gray") {
          ctx.strokeStyle = "#e8d44d";
          ctx.lineWidth = Math.max(1, tile / 12);
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
          ctx.setLineDash([]);
        }

        if (!small && tile >= 14) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.font = Math.max(6, Math.floor(tile / 3)) + "px monospace";
          ctx.fillText(st.id, x + 2, y + 2);
        }
      }

      // the four Safe-Guarded cities
      if (phase >= 3) {
        for (const c of CITIES) {
          const st = World.byId(c.tile);
          if (!st || !st.g) continue;
          const cx = ox + st.g[0] * tile + tile - 5;
          const cy = oy + st.g[1] * tile + 3;
          ctx.fillStyle = "#39d98a";
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(2, tile / 8), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#0b0e15";
          ctx.lineWidth = 1;
          ctx.stroke();
          if (!small && tile >= 16) {
            ctx.fillStyle = "#39d98a";
            ctx.font = "6px monospace";
            ctx.fillText(c.label, cx - tile + 4, cy + 4);
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
        let lx = ox;
        const ly = oy + tile * 8 + 6;
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
