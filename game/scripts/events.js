/* ============================================================
   events.js — story content + event logic  (PECLIP VIRUS)
   * TV_TIMELINE: a linear broadcast feed that DRIVES the whole
     escalation. Watching is optional, but the timeline advances
     on its own and every phase change unlocks matching alerts.
   * Government alerts (computer) and phone messages, phase-bucketed.
   * Door-visitor generation with YES/NO consequences.
   * Random ambient horror events.
   * Ending definitions.
   Exposes: window.ZH.Events, window.ZH.Content
   ============================================================ */
(function (ZH) {
  "use strict";

  const PHASES = ["NORMAL", "UNSETTLING", "ALARMING", "CATASTROPHIC", "COLLAPSE"];
  const ORDERS = [
    "NO ACTIVE ORDERS",
    "CURFEW IN EFFECT — 9:00 PM",
    "SHELTER-IN-PLACE ORDER",
    "MARTIAL LAW DECLARED",
    "CONTAINMENT DIRECTIVE — SWEEP AT DAWN",
  ];

  /* ------------------------------------------------------------
     TV TIMELINE — the Peclip Virus, from a quiet evening to the
     Eastern Coast Containment Wall. Each entry is one broadcast
     segment. `phase` (0..4) drives the rest of the game; `special`
     styles dead-air / emergency segments; `on(game)` fires a matching
     world event the moment the segment airs.
     ------------------------------------------------------------ */
  const TV_TIMELINE = [
    // ---------- PHASE 0 : NORMAL ----------
    { id: "0", phase: 0, channel: "NNC · NATIONAL NEWS",
      headline: "A Calm Evening Across the Country",
      body: "Good evening. Today's top stories: mild storms across the Atlantic, rising cruise tourism, and a promising new tech IPO. Nothing unusual. Stay with us after the break.",
      ticker: "Markets close higher · Atlantic cruise season breaks records · Mild weekend ahead" },
    { id: "1", phase: 0, channel: "NNC · BREAKING",
      headline: "Mystery Illness Aboard Atlantic Cruise Ship",
      body: "Breaking news: a small cruise ship in the Atlantic has reported a mysterious illness. Passengers have been quarantined on board. Officials say symptoms include fever, confusion, and rapid dehydration.",
      ticker: "Cruise quarantined at sea · Symptoms: fever, confusion, dehydration · Officials urge calm" },

    // ---------- PHASE 1 : UNSETTLING (curfew) ----------
    { id: "2", phase: 1, channel: "NNC · HEALTH DESK",
      headline: "Illness Spreads Beyond the Ship",
      body: "Several passengers evacuated from the cruise have tested positive for what is now being called the Peclip Virus. Hospitals in coastal cities are reporting unusual cases. Officials continue to urge calm.",
      ticker: "Named: 'Peclip Virus' · Coastal hospitals report cases · CDC monitoring situation" },
    { id: "3", phase: 1, channel: "CH7 · SPECIAL REPORT",
      headline: "Doctors Report Disturbing Symptoms",
      body: "Doctors are reporting disturbing symptoms. Infected individuals show signs of tissue decay while remaining fully conscious. Some exhibit violent behavior and extreme delirium within 24 hours. The virus appears extremely contagious.",
      ticker: "Tissue decay in conscious patients · Violent delirium within 24h · 'Extremely contagious'" },
    { id: "4", phase: 1, channel: "NNC · EMERGENCY DESK",
      headline: "Hospitals Filling With Peclip Patients",
      body: "Emergency alert: hospitals in multiple states are now filled with Peclip Virus patients. Medical staff are overwhelmed. Reports indicate patients resisting sedation and displaying abnormal strength.",
      ticker: "Hospitals at capacity · Patients resisting sedation · 'Abnormal strength' reported" },
    { id: "5", phase: 1, channel: "GOV · NATIONAL ADDRESS",
      headline: "Government: 'Do Not Panic'",
      body: "The government has issued a national statement urging citizens not to panic. Officials claim containment is underway. Military vehicles have been spotted moving toward major cities.",
      ticker: "'Containment underway' · Military vehicles near cities · Curfew under consideration" },

    // ---------- PHASE 2 : ALARMING (shelter-in-place) ----------
    { id: "6", phase: 2, channel: "GOV · DIRECTIVE",
      headline: "Urban Shutdown Order Issued",
      body: "New directive: all urban centers with high population density must begin immediate shutdown procedures. Citizens are advised to stay indoors, avoid contact, and prepare for extended isolation.",
      ticker: "SHELTER IN PLACE · Avoid all contact · Prepare for extended isolation" },
    { id: "7", phase: 2, channel: "NNC · LIVE",
      headline: "Quarantine Zones Established",
      body: "Quarantine zones have been established around infected districts. Entire neighborhoods are being sealed off. Some residents report being trapped inside the barricades.",
      ticker: "Neighborhoods sealed · Residents 'trapped inside barricades' · Do not approach zone lines" },
    { id: "8", phase: 2, channel: "CH7 · HEALTH DESK",
      headline: "Peclip Symptoms — What We Know",
      body: "New medical findings: the Peclip Virus appears to hijack the host's nervous system. Infected individuals remain mobile despite severe tissue decay. Coughing and delirium intensify within hours.",
      ticker: "Virus hijacks nervous system · Mobile despite decay · Delirium intensifies fast" },
    { id: "9", phase: 2, channel: "GOV · DEFENSE",
      headline: "Military Bases Become Relocation Posts",
      body: "The Department of Defense has converted several military bases into major processing posts for emergency relocation. Citizens from heavily infected zones are being screened and redirected.",
      ticker: "Bases open as relocation posts · Screening at all intakes · Bring documents only" },
    { id: "10", phase: 2, channel: "NNC · REGIONAL",
      headline: "Rural States Report Minimal Infection",
      body: "Southern and rural states report minimal infection so far. However, officials warn that migration out of infected urban centers may carry the virus inland.",
      ticker: "Rural states mostly clear · Migration may spread virus · Roadblocks going up" },
    { id: "11", phase: 2, channel: "CH7 · BREAKING",
      headline: "Major Cities Overrun",
      body: "New York, Virginia, and other major metropolitan areas are now overwhelmed. Emergency services have collapsed. Citizens report infected individuals wandering openly in the streets.",
      ticker: "Emergency services collapsed · Infected in the open streets · Stay away from windows" },

    // ---------- PHASE 3 : CATASTROPHIC (martial law) ----------
    { id: "12", phase: 3, channel: "GOV · EMERGENCY",
      headline: "BREAKING: Mass Evacuation Recommended",
      body: "The government now recommends immediate evacuation to designated military bases. Transportation corridors are being secured. Expect long delays and mandatory screenings at every checkpoint.",
      ticker: "Evacuate to designated bases · Corridors 'being secured' · Mandatory screening ahead" },
    { id: "13", phase: 3, channel: "NNC · FIELD FEED",
      headline: "Military Helicopters Deployed Over Cities",
      body: "Helicopters have been spotted over multiple cities. Soldiers are conducting street sweeps. Eyewitnesses report gunfire and forced evacuations. Our crew has been advised to pull back.",
      ticker: "Helicopters over the city · Street sweeps underway · Gunfire reported",
      on(g) {
        g.flags.helicopter = true; g.flags.soldiersOutside = true;
        g.audio.helicopterPass();
        g.toast("Rotors thud overhead — exactly like the broadcast said.");
        g.player.addStress(5);
        setTimeout(() => { g.flags.soldiersOutside = false; }, 16000);
      } },
    { id: "14", phase: 3, channel: "GOV · UNCONFIRMED",
      headline: "Extreme Containment Measures Feared",
      body: "Unconfirmed reports suggest federal forces may begin extreme containment measures in heavily infected zones. Citizens are urged to barricade their homes and await further instructions.",
      ticker: "'Extreme containment' feared · Barricade all entry points · Await instructions" },
    { id: "15", phase: 3, channel: "NNC · INFRASTRUCTURE",
      headline: "Power Grid Instability Reported",
      body: "Rolling blackouts are being reported across multiple states. Officials blame infrastructure strain and emergency power rerouting. Keep flashlights and batteries close.",
      ticker: "Rolling blackouts · Grid under strain · Keep flashlights ready",
      on(g) {
        if (g.flags.powerOut) return;
        g.flags.powerFlicker = true; g.audio.powerDown();
        g.toast("The whole house dims as the grid staggers.");
        setTimeout(() => { g.flags.powerFlicker = false; if (g.audio) g.audio.powerUp(); }, 5000);
      } },

    // ---------- PHASE 4 : COLLAPSE (containment) ----------
    { id: "16", phase: 4, channel: "NNC · LAST DESK",
      headline: "This May Be Our Final Transmission",
      body: "This may be our final transmission. Stay indoors. Do not approach infected individuals. Barricade all entry points. Await military instructions. To everyone still watching — good luck.",
      ticker: "Final transmission · Barricade everything · Do not approach the infected · Good luck" },
    { id: "17", phase: 4, channel: "· · · SIGNAL · · ·", special: "static",
      headline: "▓▓▓ SIGNAL LOST ▓▓▓",
      body: "The picture dissolves into static. Somewhere under the hiss, an emergency tone rises and falls. No anchors. No words. Just the noise.",
      ticker: "· · · signal lost · · · please stand by · · ·" },
    { id: "18", phase: 4, channel: "EAS · AUTOMATED", special: "emergency",
      headline: "⚠ NATIONAL EMERGENCY ALERT ⚠",
      body: "Shelter in place. Do not evacuate unless instructed by military personnel. Shelter in place. Do not evacuate unless instructed by military personnel.",
      ticker: "⚠ SHELTER IN PLACE ⚠ DO NOT EVACUATE ⚠ AWAIT MILITARY PERSONNEL ⚠" },

    // ---- STAGE 19 : EASTERN COAST COLLAPSE & MILITARY WALL ----
    { id: "19.0", phase: 4, channel: "GOV · OFFICIAL",
      headline: "Eastern Coast Declared a Collapsed Region",
      body: "BREAKING: the government has officially declared the Eastern Coast a collapsed region. All federal agencies confirm they have lost operational control over the majority of Eastern coastal states.",
      ticker: "EASTERN COAST: COLLAPSED · Federal control lost · Agencies confirm" },
    { id: "19.1", phase: 4, channel: "GOV · DEFENSE",
      headline: "Fortified Military Border Established",
      body: "The Department of Defense has established a continuous fortified border surrounding the entire Eastern Coast. This barrier spans hundreds of miles and is staffed by active military personnel.",
      ticker: "Fortified border stood up · Hundreds of miles · Fully staffed" },
    { id: "19.2", phase: 4, channel: "GOV · DIRECTIVE",
      headline: "Shoot-on-Sight Order at the Border",
      body: "Military command has issued a shoot-on-sight directive for anyone attempting to cross the Eastern Coast border without authorization. Officials call it necessary to prevent further spread of the Peclip Virus.",
      ticker: "SHOOT ON SIGHT at the border · No unauthorized crossing · 'Necessary containment'",
      on(g) { g.player.addStress(6); g.toast("Shoot on sight. You read it twice. There is no leaving now."); } },
    { id: "19.3", phase: 4, channel: "GOV · TRANSPORT",
      headline: "Eastern Coast Sealed From the Interior",
      body: "All highways, bridges, tunnels, and rail lines connecting the Eastern Coast to inland states have been shut down. Armored vehicles block every major route. The region is now fully isolated.",
      ticker: "All routes shut · Armor on every road · Region fully isolated" },
    { id: "19.4", phase: 4, channel: "GOV · OFFICIAL",
      headline: "Four Safe-Guarded Zones Announced",
      body: "Only four cities remain under full military protection: New York City, Washington D.C., Philadelphia, and Baltimore. These are designated 'Safe-Guarded Zones.' All other Eastern cities are considered compromised.",
      ticker: "SAFE ZONES: NYC · WASHINGTON D.C. · PHILADELPHIA · BALTIMORE · all else compromised" },
    { id: "19.5", phase: 4, channel: "NNC · REMOTE",
      headline: "New York Under Heavy Occupation",
      body: "New York City is now under heavy military occupation. Soldiers patrol every borough. Helicopters circle the skyline. Reports indicate strict curfews and mandatory screenings at all checkpoints.",
      ticker: "NYC occupied · Choppers over the skyline · Curfew absolute",
      on(g) { g.flags.helicopter = true; } },
    { id: "19.6", phase: 4, channel: "GOV · CAPITAL",
      headline: "Washington D.C. Fully Fortified",
      body: "Washington D.C. has become the most heavily protected location in the region. Government buildings are ringed with barricades, anti-vehicle traps, and armed guards. No civilian movement is allowed after sundown.",
      ticker: "D.C. fortified · Anti-vehicle traps · No civilian movement after dark" },
    { id: "19.7", phase: 4, channel: "GOV · REGIONAL",
      headline: "Philadelphia & Baltimore in Full Lockdown",
      body: "Philadelphia and Baltimore have entered full lockdown. Residents are ordered to remain indoors. Military convoys continue to reinforce defensive lines around both cities.",
      ticker: "Philly & Baltimore locked down · Stay indoors · Lines reinforcing" },
    { id: "19.8", phase: 4, channel: "GOV · NOTICE",
      headline: "Everywhere Else: Trapped & Abandoned",
      body: "Officials confirm that all other Eastern towns, suburbs, and rural communities are now isolated. No evacuation routes remain open. Citizens are advised to shelter in place and await further instructions.",
      ticker: "No routes remain · Towns abandoned · Shelter in place indefinitely",
      on(g) { g.toast("No routes remain. Your street is on the wrong side of every wall."); g.player.addStress(6); } },
    { id: "19.9", phase: 4, channel: "GOV · DEFENSE",
      headline: "Bases Close Their Doors to Civilians",
      body: "Military bases along the Eastern Coast have ceased civilian intake. Bases are transitioning to defensive operations only. No further evacuations will be processed.",
      ticker: "Civilian intake ended · Defensive ops only · No further evacuations" },
    { id: "19.10", phase: 4, channel: "GOV · OFFICIAL",
      headline: "Containment Wall Nearing Completion",
      body: "Construction of the Eastern Coast Containment Wall is nearing completion — reinforced concrete, steel plating, watchtowers, and automated floodlights. Officials say it will remain in place indefinitely.",
      ticker: "Wall nearly complete · Watchtowers & floodlights · In place 'indefinitely'" },
    { id: "19.11", phase: 4, channel: "EAS · AUTOMATED", special: "emergency",
      headline: "⚠ FINAL WARNING ⚠",
      body: "This is an emergency broadcast. Do not attempt to leave your home. Do not approach military borders. Do not attempt to enter Safe-Guarded Zones without authorization. Stay inside. Barricade all entry points. Await further instructions.",
      ticker: "⚠ DO NOT LEAVE HOME ⚠ DO NOT APPROACH BORDERS ⚠ BARRICADE EVERYTHING ⚠" },

    // ---- THE FULL NATIONAL PECLIP VIRUS REPORT ----
    // (the last complete transmission before the TV dies)
    { id: "20.0", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "New York City Remains a Green Safe Zone",
      body: "Despite catastrophic outbreaks across the Eastern Coast, New York City remains a Green Safe Zone. Massive military fortifications, early containment, and strict curfews have kept infection levels extremely low. Border walls ring every borough. Helicopters patrol around the clock. Mandatory screenings. No civilian entry. The last jewel of the East.",
      ticker: "NYC: GREEN SAFE ZONE · walls around all boroughs · 24/7 helicopter patrols · NO CIVILIAN ENTRY",
      on(g) { g.flags.helicopter = true; } },
    { id: "20.1", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Eastern Coast: Total Collapse Outside New York",
      body: "The rest of the Eastern Coast has suffered total collapse. All major states except New York have fallen into uncontrolled infection. Maine, New Hampshire, Massachusetts, Rhode Island, Connecticut, New Jersey, Delaware, Maryland, Virginia, the Carolinas, Georgia and Florida are now designated lost territories.",
      ticker: "LOST TERRITORIES: ME · NH · MA · RI · CT · NJ · DE · MD · VA · NC · SC · GA · FL" },
    { id: "20.2", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Gray Zones Declared: 'Unrecoverable Territories'",
      body: "Military command has designated several regions Unrecoverable: California's Los Angeles mega-outbreak, southern Oregon, western Arizona, coastal Washington, Long Island, and northern New Jersey. These regions are fully isolated by military bases. No evacuation. No rescue. No government control.",
      ticker: "GRAY ZONES: CALIFORNIA · S. OREGON · W. ARIZONA · COASTAL WA · LONG ISLAND · N. NEW JERSEY — NO RESCUE",
      on(g) {
        if (g.zoneId === "gray") {
          g.toast("They just said it on the air. Your region. Unrecoverable.");
          g.player.addStress(10);
        }
      } },
    { id: "20.3", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Fortified Walls Rise Around the Gray Zones",
      body: "Fortified walls have been erected around the Gray Zones — reinforced concrete, steel plating, watchtowers, and automated floodlights. Their purpose: keep the infected inside, protect the neighboring safe zones, stage helicopter strike waves, and prevent all civilian entry.",
      ticker: "Walls sealed · Watchtowers manned · Floodlights automated · Nothing gets out" },
    { id: "20.4", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Helicopter Strike Waves: 'Cluster Destruction Ops'",
      body: "Helicopter units have begun targeted destruction raids on massive virus clusters inside the Gray Zones. The pattern: enter the zone, destroy the cluster, burn the infected districts, extract survivors, withdraw before dark — then repeat the next day. These raids do not reclaim territory. They only reduce the viral mass.",
      ticker: "Strike waves daily · Burn the clusters · Extract survivors · Withdraw · Repeat",
      on(g) {
        g.flags.helicopter = true;
        if (g.zoneId === "gray") {
          setTimeout(() => { g.audio.explosion(); g.shake(7); g.fx.flash = 0.3; }, 1400);
          g.toast("Somewhere across the zone, a cluster stops existing. The window hums.");
          g.player.addStress(6);
        }
      } },
    { id: "20.5", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Gangs and Militias Now Hold the Districts",
      body: "With government control gone, local gangs, militias and neighborhood groups have become the primary defense forces inside the Gray Zones — barricading streets, patrolling rooftops, arming civilians, raising makeshift walls. It is… ironic. The groups once considered dangerous are now the only thing preventing total infection spread.",
      ticker: "Districts held by gangs & militias · Rooftop patrols · Makeshift walls · 'It is… ironic.'" },
    { id: "20.6", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Military Bases Become Fortress-Cities",
      body: "Military bases bordering the Gray Zones now operate as fortress-cities: launching daily raids, destroying virus clusters, passing leftover supplies over the wall to civilians, and retreating behind the wire by nightfall — then repeating operations at first light.",
      ticker: "Fortress-cities on the border · Daily raids · Supplies over the wall · Behind the wire by dark" },
    { id: "20.7", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "The Final Safe Zones",
      body: "These are the last functioning regions of the country: New York City, the Washington interior, the Oregon interior, Idaho, Montana, Wyoming, Colorado, Utah, the Nevada interior, the Arizona interior, New Mexico, Texas, Oklahoma, Kansas, Nebraska and Iowa. Everything else is contested, collapsed, or gray.",
      ticker: "FINAL SAFE ZONES: NYC · WA/OR/NV/AZ interiors · ID · MT · WY · CO · UT · NM · TX · OK · KS · NE · IA" },
    { id: "20.8", phase: 4, channel: "NNC · SIGNING OFF",
      headline: "This Is Our Last Full Broadcast",
      body: "If you are inside a Gray Zone… you are on your own. If you are inside a Safe Zone… remain indoors. Avoid all contact. This is our last full broadcast. To everyone still out there — [the anchor's voice breaks] — good night, and good luck.",
      ticker: "· · · this is our last full broadcast · · · good night · · · good luck · · ·",
      on(g) { g.player.addStress(5); } },

    { id: "19.12", phase: 4, channel: "· · · SIGNAL · · ·", special: "static",
      headline: "▓▓ SIGNAL DISTORTION ▓▓",
      body: "Static swallows the screen. Distorted voices bleed through — too slow, too many, overlapping. An emergency tone loops beneath them and will not stop.",
      ticker: "▓▓▓ distorted voices ▓▓▓ tone looping ▓▓▓" },
    { id: "19.13", phase: 4, channel: "EAS · FINAL", special: "emergency",
      headline: "⚠ EASTERN COAST UNDER FULL QUARANTINE ⚠",
      body: "The Eastern Coast is under full quarantine. No further broadcasts will be transmitted. This message will now repeat until the signal ends.",
      ticker: "⚠ FULL QUARANTINE ⚠ NO FURTHER BROADCASTS ⚠" },
    { id: "19.14", phase: 4, channel: "NO SIGNAL", special: "black",
      headline: "",
      body: "",
      ticker: "" },
  ];

  /* ------------------------------------------------------------
     GOVERNMENT ALERTS (computer terminal). Unlocked per phase.
     ------------------------------------------------------------ */
  const GOV_ALERTS = [
    // phase 0
    [{ level: "ADVISORY", text: "PECLIP HEALTH ADVISORY: monitor for fever, confusion, and dehydration. Report unusual illness to your local clinic. There is currently no cause for public concern." }],
    // phase 1
    [
      { level: "WARNING", text: "CURFEW ENACTED effective 21:00. Remain indoors overnight. Do not approach anyone exhibiting aggressive or disoriented behavior — the Peclip Virus is now confirmed contagious." },
      { level: "WARNING", text: "Coastal screening increased. Non-essential travel out of infected counties is suspended." },
    ],
    // phase 2
    [
      { level: "CRITICAL", text: "SHELTER-IN-PLACE ORDER in effect for all urban residents. Lock and barricade every point of entry. Move away from ground-floor windows." },
      { level: "CRITICAL", text: "Peclip spreads through bites and fluids. Hosts remain mobile despite severe tissue decay. DO NOT ATTEMPT TO ASSIST THE INFECTED." },
    ],
    // phase 3
    [
      { level: "CRITICAL", text: "MARTIAL LAW is in force. Military units have authority over this district. Comply with all personnel. Verify the insignia of any evacuation team before opening your door." },
      { level: "CRITICAL", text: "Evacuation corridors are collapsing. Relocation bases are near capacity. If you can reach a Safe-Guarded Zone, do so before the routes close." },
    ],
    // phase 4
    [
      { level: "CRITICAL", text: "CONTAINMENT DIRECTIVE AUTHORIZED. This grid lies outside the Eastern Coast Safe-Guarded Zones. A sanitation sweep begins at first light. Remaining residents are not classified as survivors." },
      { level: "CRITICAL", text: "This terminal is going offline as the grid is sealed. There will be no further transmissions. You are on your own until dawn." },
    ],
  ];

  /* ------------------------------------------------------------
     PHONE MESSAGES. Unlocked per phase (personal + emergency).
     ------------------------------------------------------------ */
  const PHONE_MSGS = [
    // phase 0
    [
      { from: "Mom", text: "Did you eat? There's soup in the freezer. Call me tomorrow. Love you. 💛" },
      { from: "Dave (next door)", text: "yo did you see that cruise ship story? wild. beer this weekend still on?" },
    ],
    // phase 1
    [
      { from: "Work — HR", text: "Office closed tomorrow out of an abundance of caution re: the Peclip situation. Stay home. Stay safe." },
      { from: "EMERGENCY ALERTS", gov: true, text: "CURFEW 9PM. Peclip Virus confirmed contagious. Remain indoors. Secure your residence. This is not a drill." },
      { from: "Mom", text: "Sweetheart the news is scaring me. They named it — the Peclip Virus. Lock your doors. Please answer." },
    ],
    // phase 2
    [
      { from: "EMERGENCY ALERTS", gov: true, text: "SHELTER IN PLACE. Quarantine zones active. Do not open your door to anyone you cannot verify. Barricade now." },
      { from: "Dave (next door)", text: "something's wrong with the Hendersons. dont go outside. their skin was— just dont. barricade your doors man" },
      { from: "Mom", text: "I can't reach your father. The lines keep— [message failed to send]" },
    ],
    // phase 3
    [
      { from: "EMERGENCY ALERTS", gov: true, text: "MARTIAL LAW. Military patrols active. Evac to a Safe-Guarded Zone if you can. Do not approach checkpoints after dark." },
      { from: "Unknown", text: "if a soldier tells you to open up — dont. theyre not taking people to shelters anymore. i saw what they do" },
      { from: "Dave (next door)", text: "im in my attic. i can hear them in the street. if you read this, stay quiet. stay dark" },
    ],
    // phase 4
    [
      { from: "EMERGENCY ALERTS", gov: true, text: "CONTAINMENT DIRECTIVE. This grid is outside the wall. Sweep at dawn. There is no further evacuation. Signal ends." },
      { from: "Mom", text: "im here. whatever happens tonight i love you. stay in the dark. wait for the light. [SENT 1 of 1]" },
    ],
  ];

  /* ------------------------------------------------------------
     ENDINGS
     ------------------------------------------------------------ */
  const ENDINGS = {
    survive: {
      mood: "good", title: "DAWN",
      text: "The sky pales to grey. Somewhere a bird — an actual bird — starts to sing. The sweep never reached your block. You are still here: exhausted, hollowed out, changed forever… but alive. The long night is over. For now.",
    },
    rescued: {
      mood: "good", title: "EXTRACTED",
      text: "The insignia was real. Gloved hands pull you into the armored truck and the doors slam against the dark. Through the slit you watch your street disappear behind the wall — bound for a Safe-Guarded Zone. You made the right call at the right door.",
    },
    taken: {
      mood: "grim", title: "PROCESSED",
      text: "They were never here to rescue anyone. Under the Containment Directive there are no survivors in this grid — only 'unresolved movement.' The soldiers don't meet your eyes as they lead you out past the wall. The door you opened was the last choice you ever made.",
    },
    infected: {
      mood: "bad", title: "TURNED",
      text: "It only took one bite. The Peclip fever comes fast — first the cold, then the heat, then the decay you can feel spreading while you stay horribly, completely awake. Your last clear thought is of how normal the evening had started. Then the thought, like the rest of you, begins to rot.",
    },
    compound: {
      mood: "good", title: "THE COMPOUND",
      text: "The militia walks you three blocks through the dark, rifles sweeping every doorway, and pulls you inside a wall of welded cars and nailed plywood. It isn't the government. It isn't rescue. But there are lights, and soup, and people on watch — and in a Gray Zone, that is everything.",
    },
    panic: {
      mood: "grim", title: "THE LONGEST NIGHT",
      text: "Somewhere between the third helicopter and the screaming next door, something in you simply… broke. You are still in your house. The doors are still shut. But you are not really here anymore, and you never fully will be again.",
    },
    overrun: {
      mood: "bad", title: "BREACHED",
      text: "The barricades were never going to be enough. Wood splinters. The window frame gives. The dark pours in through every gap at once. You back into the corner of your own living room and there is nowhere left to go.",
    },
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ------------------------------------------------------------
     DOOR VISITORS
     ------------------------------------------------------------ */
  const Events = {
    PHASES, ORDERS, TV_TIMELINE, GOV_ALERTS, PHONE_MSGS, ENDINGS,

    makeVisitor(game) {
      const phase = game.phase;
      const roll = Math.random();

      // Gray zones have no government: militias, gangs and the infected
      // own the street. Nobody official ever knocks.
      if (game.zoneId === "gray") {
        if (phase >= 3 && roll < 0.14) return this._militiaEscort();
        if (roll < 0.34) return this._militia();
        if (roll < 0.54) return this._gang();
        if (roll < 0.8) return this._infected();
        return this._survivor("desperate");
      }

      if (phase >= 4) {
        if (roll < 0.6) return this._soldier(true);
        if (roll < 0.85) return this._infected();
        return this._survivor("desperate");
      }
      if (phase === 3) {
        if (roll < 0.28) return this._soldier(false);
        if (roll < 0.5) return this._infected();
        if (roll < 0.66) return this._evac();
        if (roll < 0.85) return this._looter();
        return this._survivor("desperate");
      }
      if (phase === 2) {
        if (roll < 0.3) return this._infected();
        if (roll < 0.5) return this._looter();
        if (roll < 0.62) return this._soldier(false);
        return this._survivor("scared");
      }
      if (phase === 1) {
        if (roll < 0.18) return this._infected();
        if (roll < 0.4) return this._survivor("neighbor");
        return this._survivor("normal");
      }
      if (roll < 0.5) return this._survivor("neighbor");
      return this._survivor("delivery");
    },

    _survivor(kind) {
      const variants = {
        delivery: {
          sprite: "person", color: "#6a5030",
          title: "A DELIVERY DRIVER",
          desc: "A tired-looking courier holds up a package. 'Late shift, sorry. Sign here?' Everything about it is completely, boringly ordinary.",
          yes: { stress: -3, message: "You sign for the package. A moment of normalcy. It helps, a little." },
          no: { stress: +3, message: "You wave them off through the peephole. They shrug and leave the box on the step." },
        },
        neighbor: {
          sprite: "person", color: "#3a6a4a",
          title: "DAVE FROM NEXT DOOR",
          desc: "It's Dave, holding a six-pack and grinning. 'Saw your light on. This Peclip thing on the news has me a little jumpy, ha. Everything okay over here?'",
          yes: { stress: -8, message: "You share a beer with Dave and pretend, for an hour, that nothing is wrong. Human company steadies you.", flags: { ally: true } },
          no: { stress: +6, message: "You tell Dave it's not a good time. His smile falters. 'Yeah… okay. Stay safe, man.' You feel like a coward." },
        },
        normal: {
          sprite: "person", color: "#4a5a7a",
          title: "A WORRIED WOMAN",
          desc: "A woman clutches her coat shut. 'I'm sorry to bother you — my phone died and the buses stopped. Could I just call my kids?'",
          yes: { stress: -4, message: "She makes her call, thanks you, and hurries home. You did a small good thing tonight." },
          no: { stress: +5, message: "You keep the door shut. She nods, understanding, and vanishes into the dark." },
        },
        scared: {
          sprite: "person", color: "#7a4a4a",
          title: "A FRANTIC STRANGER",
          desc: "A man pounds the door, glancing over his shoulder. 'Please — PLEASE — one of them is coming down the block. Let me in, I'm begging you!' He doesn't look infected. You think.",
          yes: { stress: -2, message: "You pull him inside and slam the door. He collapses, shaking, whispering thanks. He seems… okay. Human.", flags: { ally: true }, risk: 0.18 },
          no: { stress: +12, message: "You can't risk it. You hold the door shut. His pleading turns to a scream, then to silence. You'll hear it for the rest of your life." },
        },
        desperate: {
          sprite: "person", color: "#5a3a3a",
          title: "SOMEONE YOU RECOGNIZE",
          desc: "It's a face from the neighborhood, gaunt and streaked with grime. 'It's me — it's ME — you KNOW me. Open the door. Please. Before the patrol comes back.'",
          yes: { stress: -1, message: "You open up. They stumble in, weeping. For a terrible moment you were sure — but no. Just a person. Just as scared as you.", flags: { ally: true }, risk: 0.32 },
          no: { stress: +10, message: "You keep it shut and slide to the floor with your back against the wood, hands over your ears." },
        },
      };
      const v = variants[kind] || variants.normal;
      return this._wrap(v, "person");
    },

    _infected() {
      const v = {
        sprite: "infected", color: "#5a6b4e",
        title: "SOMETHING AT THE DOOR",
        desc: "A figure stands too still on the porch, head tilted at a wrong angle. When it moves it is in a twitching lurch. The skin has gone grey and split; a dark stain spreads down its front. It does not knock so much as… scratch. Peclip. Late-stage. Still, somehow, awake.",
        yes: { ending: "infected", message: "You open the door. It moves faster than anything human. Teeth find your forearm before you can even scream." },
        no: { stress: +9, message: "You back away from the door. It scratches for a while, loses interest, and shambles off into the night. That was NOT a person. Not anymore." },
      };
      return this._wrap(v, "infected");
    },

    _looter() {
      const v = {
        sprite: "person", color: "#333a44",
        title: "MEN WITH A CROWBAR",
        desc: "Two men in bandanas case your porch. One taps a crowbar against his palm. 'Open up, neighbor. We just wanna talk about what you got in there.' They are very much alive, and that is the problem.",
        yes: { ending: "overrun", message: "You open the door to reason with them. They shove past you. It goes badly, and quickly." },
        no: { stress: +8, message: "You refuse. They batter the door until a barricade plank cracks — then move on to easier prey. Your defenses are weaker now.", damage: 1 },
      };
      return this._wrap(v, "person");
    },

    _soldier(sweeping) {
      if (sweeping) {
        const v = {
          sprite: "soldier", color: "#4a543c",
          title: "A SOLDIER IN A GAS MASK",
          desc: "A figure in full tactical gear raps a rifle barrel against your door. The voice through the respirator is flat: 'Occupant. Open the door and step out for processing. Containment Directive. This is not a request.'",
          yes: { ending: "taken", message: "You open the door. Two soldiers flank you before you finish exhaling. 'Movement confirmed.' They do not take you to a Safe-Guarded Zone." },
          no: { stress: +14, message: "You stay silent in the dark. A pause. 'Marking structure for the morning sweep.' Boots retreat. You have until dawn.", flags: { marked: true } },
        };
        return this._wrap(v, "soldier");
      }
      const v = {
        sprite: "soldier", color: "#4a543c",
        title: "A NATIONAL GUARD SOLDIER",
        desc: "A young soldier, visor up, looks exhausted. 'Sir/ma'am, martial law is in effect. Stay inside, lights off, away from the windows. Do NOT open this door again tonight — not for anyone. Understood?'",
        yes: { stress: -3, message: "You crack the door. He repeats his warning, presses a ration bar into your hand, and moves on. Small mercy." },
        no: { stress: +2, message: "You answer through the door. 'Smart,' he says. 'Keep it that way.' His footsteps fade." },
      };
      return this._wrap(v, "soldier");
    },

    _militia() {
      const v = {
        sprite: "person", color: "#5a5a3a",
        title: "A MILITIA PATROL",
        desc: "Three locals in mismatched armor and duct-taped pads stand on your porch. The one in front lowers her bat. 'District watch. We're reinforcing houses on this street tonight. You want boards on that door or not?'",
        yes: { stress: -6, repair: 1, message: "They nail an extra board across your frame in under a minute, tap the wall twice, and move to the next house. The district holds together — barely — because of people like this." },
        no: { stress: +4, message: "'Suit yourself.' They mark your fence with chalk and move on. You wonder what the mark means." },
      };
      return this._wrap(v, "person");
    },

    _gang() {
      const v = {
        sprite: "person", color: "#333a44",
        title: "A CREW FROM THE NEXT BLOCK",
        desc: "Four figures with bandanas and a shopping cart full of scrap. 'Toll time, neighbor. Everybody on this street chips in for the wall — food, tools, batteries. Open up and pay, or we remember your door.'",
        yes: { stress: +8, risk: 0.12, message: "You crack the door and hand over canned food and your spare batteries. One of them actually writes it in a ledger. 'Wall's getting taller,' he says. Protection has a price now." },
        no: { stress: +9, damage: 1, message: "You keep it shut. A bat cracks against a barricade plank — once, twice — and then they move on. They'll remember your door." },
      };
      return this._wrap(v, "person");
    },

    _militiaEscort() {
      const v = {
        sprite: "person", color: "#4a5a3a",
        title: "THE DISTRICT MILITIA — EVACUATING THE BLOCK",
        desc: "The woman with the bat is back, breathing hard. 'Cluster's moving this way. Strike wave hits this grid at first light. We're pulling everyone back to the compound — armed escort, right now. Last call.'",
        yes: { ending: "compound", message: "You follow their flashlights through the dark, block by block, and the compound gate scrapes shut behind you." },
        no: { stress: +14, message: "'Your funeral.' The flashlights bob away down the street, and the night closes in around your house.", flags: { marked: true } },
      };
      return this._wrap(v, "person");
    },

    _evac() {
      const v = {
        sprite: "soldier", color: "#3a5a6a",
        title: "A VERIFIED EVAC TEAM",
        desc: "Two figures in orange-marked hazmat gear hold up a lit ID board: RESCUE — GRID EVACUATION. 'We have a truck at the end of the block for ninety more seconds, bound for the Safe-Guarded Zone. This is a real evac. Come NOW or we leave without you.'",
        yes: { ending: "rescued", message: "You grab nothing and run for the truck. The doors slam. You made it behind the wall." },
        no: { stress: +16, message: "You can't be sure it's real — so many tricks tonight. You stay. The engine roars away without you. Silence rushes back in.", flags: { missedEvac: true } },
      };
      return this._wrap(v, "soldier");
    },

    _wrap(v, sprite) {
      return {
        sprite, color: v.color, title: v.title, desc: v.desc,
        resolve(choice, game) {
          const out = choice === "yes" ? v.yes : v.no;
          const res = { ending: null, stress: out.stress || 0, message: out.message, flags: out.flags || null };
          if (choice === "yes" && out.risk && Math.random() < out.risk) {
            res.ending = "infected";
            res.message = "For a few minutes they seem fine. Then the shivering starts. Then the fever. Then they lunge — you let the Peclip inside your walls.";
          } else if (out.ending) {
            res.ending = out.ending;
          }
          if (out.damage) game.damageBarricade("door", out.damage);
          if (out.repair) game.barricades.door = Math.min(3, game.barricades.door + out.repair);
          return res;
        },
      };
    },

    /* ------------------------------------------------------------
       RANDOM AMBIENT HORROR EVENTS
       ------------------------------------------------------------ */
    horrorEvents: [
      { id: "heli", minPhase: 2, weight: 3, run(game) {
          game.flags.helicopter = true; game.audio.helicopterPass();
          game.toast("A helicopter thunders low over the roof. The windows rattle.");
          game.player.addStress(4);
        } },
      { id: "gunfire", minPhase: 2, weight: 4, run(game) {
          game.audio.distantGunfire(); game.shake(3); game.fx.redFlash = 0.25;
          game.toast("Gunfire crackles a few streets over. Then nothing.");
          game.player.addStress(5);
        } },
      { id: "scream", minPhase: 2, weight: 4, run(game) {
          game.audio.scream();
          game.toast("A scream rises somewhere outside — cut brutally short.");
          game.player.addStress(6);
        } },
      { id: "strikewave", minPhase: 2, weight: 4, zones: ["gray"], run(game) {
          game.flags.helicopter = true;
          game.audio.helicopterPass();
          setTimeout(() => { game.audio.explosion(); game.shake(8); game.fx.flash = 0.35; }, 1300);
          game.toast("A strike wave hammers a cluster a few blocks over. The floor jumps. Ash drifts past the window.");
          game.player.addStress(8);
        } },
      { id: "gangdefense", minPhase: 1, weight: 3, zones: ["gray"], run(game) {
          game.audio.distantGunfire();
          game.toast("The crew on the corner opens up on something crawling out of the dark. The shooting stops. Then the cheering starts.");
          game.player.addStress(4);
        } },
      { id: "patrol", minPhase: 3, weight: 3, notZones: ["gray"], run(game) {
          game.flags.soldiersOutside = true; game.audio.siren(true);
          game.toast("Soldiers move down the street, sweeping doorways with flashlights.");
          game.player.addStress(4);
          setTimeout(() => { game.flags.soldiersOutside = false; game.audio.siren(false); }, 16000);
        } },
      { id: "flicker", minPhase: 1, weight: 4, run(game) {
          if (game.flags.powerOut) return;
          game.flags.powerFlicker = true; game.audio.powerDown();
          game.toast("The lights stutter — the whole house dims, then holds.");
          game.player.addStress(3);
          setTimeout(() => { game.flags.powerFlicker = false; game.audio.powerUp(); }, 4000);
        } },
      { id: "housenoise", minPhase: 0, weight: 5, run(game) {
          game.audio.houseNoise();
          const lines = [
            "A floorboard creaks upstairs. You are certain you're alone.",
            "Something settles in the walls. Just the house cooling. Probably.",
            "A slow drag of something across the floor above you. You hold your breath.",
            "The basement door bumps softly in its frame. You didn't leave a window open… did you?",
          ];
          game.toast(pick(lines)); game.player.addStress(4);
        } },
      { id: "whisper", minPhase: 2, weight: 2, run(game) {
          game.audio.whisper();
          game.toast("You hear your own name, whispered, from an empty room. You tell yourself it's the wind.");
          game.player.addStress(7);
        } },
      { id: "poweroff", minPhase: 4, weight: 3, once: true, run(game) {
          game.flags.powerOut = true; game.audio.powerDown();
          game.toast("Every light in the house dies at once. The grid is gone. Only your screens remain.");
          game.player.addStress(10);
        } },
    ],

    pickHorror(game) {
      const avail = this.horrorEvents.filter((e) =>
        game.phase >= e.minPhase &&
        !(e.once && game.firedOnce[e.id]) &&
        (!e.zones || e.zones.includes(game.zoneId)) &&
        (!e.notZones || !e.notZones.includes(game.zoneId)));
      if (!avail.length) return null;
      let total = 0; for (const e of avail) total += e.weight;
      let r = Math.random() * total;
      for (const e of avail) { r -= e.weight; if (r <= 0) return e; }
      return avail[avail.length - 1];
    },
  };

  ZH.Events = Events;
  ZH.Content = { TV_TIMELINE, GOV_ALERTS, PHONE_MSGS, ENDINGS, PHASES, ORDERS };
})(window.ZH = window.ZH || {});
