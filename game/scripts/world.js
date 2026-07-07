/* ============================================================
   world.js — the national Peclip situation map
   Zone tiers (from the national report map), every state's tier,
   spawn-area types, and the menu location picker.
   A zone changes the whole run: local severity offset, knock and
   horror frequency, breach danger, and who shows up at your door.
   Exposes: window.ZH.World
   ============================================================ */
(function (ZH) {
  "use strict";

  /* offset  — added to the national phase to get LOCAL severity (0..4)
     knockMul/horrorMul — multiply the interval between events
                          (bigger = calmer, smaller = relentless)
     breachMul — multiplies finale breach probability               */
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

  /* Zone assignment follows the national situation map. */
  const STATES = [
    // ---- GREEN SAFE ZONES ----
    { id: "NYC", name: "New York City — Fortress", zone: "green" },
    { id: "WA", name: "Washington", zone: "green" },
    { id: "ID", name: "Idaho", zone: "green" },
    { id: "MT", name: "Montana", zone: "green" },
    { id: "WY", name: "Wyoming", zone: "green" },
    { id: "ND", name: "North Dakota", zone: "green" },
    { id: "SD", name: "South Dakota", zone: "green" },
    { id: "NE", name: "Nebraska", zone: "green" },
    { id: "MN", name: "Minnesota", zone: "green" },
    { id: "IA", name: "Iowa", zone: "green" },
    { id: "WI", name: "Wisconsin", zone: "green" },
    { id: "MI", name: "Michigan", zone: "green" },
    { id: "AK", name: "Alaska", zone: "green" },
    { id: "HI", name: "Hawaii", zone: "green" },
    // ---- STRAINED ----
    { id: "UT", name: "Utah", zone: "yellow" },
    { id: "CO", name: "Colorado", zone: "yellow" },
    { id: "KS", name: "Kansas", zone: "yellow" },
    { id: "MO", name: "Missouri", zone: "yellow" },
    { id: "IL", name: "Illinois", zone: "yellow" },
    { id: "OK", name: "Oklahoma", zone: "yellow" },
    { id: "AR", name: "Arkansas", zone: "yellow" },
    { id: "LA", name: "Louisiana", zone: "yellow" },
    { id: "MS", name: "Mississippi", zone: "yellow" },
    { id: "AL", name: "Alabama", zone: "yellow" },
    { id: "GA", name: "Georgia", zone: "yellow" },
    { id: "SC", name: "South Carolina", zone: "yellow" },
    { id: "NC", name: "North Carolina", zone: "yellow" },
    { id: "FL", name: "Florida", zone: "yellow" },
    // ---- FRONTLINE ----
    { id: "AZ", name: "Arizona", zone: "orange" },
    { id: "NM", name: "New Mexico", zone: "orange" },
    // ---- OVERRUN ----
    { id: "TX", name: "Texas", zone: "red" },
    { id: "IN", name: "Indiana", zone: "red" },
    { id: "OH", name: "Ohio", zone: "red" },
    { id: "KY", name: "Kentucky", zone: "red" },
    { id: "WV", name: "West Virginia", zone: "red" },
    { id: "TN", name: "Tennessee", zone: "red" },
    // ---- COLLAPSED EAST ----
    { id: "ME", name: "Maine", zone: "darkred" },
    { id: "NH", name: "New Hampshire", zone: "darkred" },
    { id: "VT", name: "Vermont", zone: "darkred" },
    { id: "MA", name: "Massachusetts", zone: "darkred" },
    { id: "RI", name: "Rhode Island", zone: "darkred" },
    { id: "CT", name: "Connecticut", zone: "darkred" },
    { id: "NY", name: "New York (state)", zone: "darkred" },
    { id: "NJ", name: "New Jersey", zone: "darkred" },
    { id: "PA", name: "Pennsylvania", zone: "darkred" },
    { id: "DE", name: "Delaware", zone: "darkred" },
    { id: "MD", name: "Maryland", zone: "darkred" },
    { id: "DC", name: "Washington D.C.", zone: "darkred" },
    { id: "VA", name: "Virginia", zone: "darkred" },
    // ---- GRAY / UNRECOVERABLE ----
    { id: "CA", name: "California (L.A. Mega-Outbreak)", zone: "gray" },
    { id: "OR", name: "Oregon", zone: "gray" },
    { id: "NV", name: "Nevada", zone: "gray" },
    { id: "LI", name: "Long Island — Cut Off", zone: "gray" },
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
      stateSel.value = "KS"; // an ordinary strained-zone start by default

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
  };

  ZH.World = World;
})(window.ZH = window.ZH || {});
