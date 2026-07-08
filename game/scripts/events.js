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
    { id: "19.15", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "New York City Remains a Green Safe Zone",
      body: "Despite catastrophic outbreaks across the Eastern Coast, New York City remains a Green Safe Zone. Massive military fortifications, early containment, and strict curfews have kept infection levels extremely low. Border walls ring every borough. Helicopters patrol around the clock. Mandatory screenings. No civilian entry. The last jewel of the East.",
      ticker: "NYC: GREEN SAFE ZONE · walls around all boroughs · 24/7 helicopter patrols · NO CIVILIAN ENTRY",
      on(g) { g.flags.helicopter = true; } },
    { id: "19.16", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Eastern Coast: Total Collapse Outside New York",
      body: "The rest of the Eastern Coast has suffered total collapse. All major states except New York have fallen into uncontrolled infection. Maine, New Hampshire, Massachusetts, Rhode Island, Connecticut, New Jersey, Delaware, Maryland, Virginia, the Carolinas, Georgia and Florida are now designated lost territories.",
      ticker: "LOST TERRITORIES: ME · NH · MA · RI · CT · NJ · DE · MD · VA · NC · SC · GA · FL" },
    { id: "19.17", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Gray Zones Declared: 'Unrecoverable Territories'",
      body: "Military command has designated several regions Unrecoverable: California's Los Angeles mega-outbreak, southern Oregon, western Arizona, coastal Washington, Long Island, and northern New Jersey. These regions are fully isolated by military bases. No evacuation. No rescue. No government control.",
      ticker: "GRAY ZONES: CALIFORNIA · S. OREGON · W. ARIZONA · COASTAL WA · LONG ISLAND · N. NEW JERSEY — NO RESCUE",
      on(g) {
        if (g.zoneId === "gray") {
          g.toast("They just said it on the air. Your region. Unrecoverable.");
          g.player.addStress(10);
        }
      } },
    { id: "19.18", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Fortified Walls Rise Around the Gray Zones",
      body: "Fortified walls have been erected around the Gray Zones — reinforced concrete, steel plating, watchtowers, and automated floodlights. Their purpose: keep the infected inside, protect the neighboring safe zones, stage helicopter strike waves, and prevent all civilian entry.",
      ticker: "Walls sealed · Watchtowers manned · Floodlights automated · Nothing gets out" },
    { id: "19.19", phase: 4, channel: "NNC · NATIONAL REPORT",
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
    { id: "19.20", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Gangs and Militias Now Hold the Districts",
      body: "With government control gone, local gangs, militias and neighborhood groups have become the primary defense forces inside the Gray Zones — barricading streets, patrolling rooftops, arming civilians, raising makeshift walls. It is… ironic. The groups once considered dangerous are now the only thing preventing total infection spread.",
      ticker: "Districts held by gangs & militias · Rooftop patrols · Makeshift walls · 'It is… ironic.'" },
    { id: "19.21", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "Military Bases Become Fortress-Cities",
      body: "Military bases bordering the Gray Zones now operate as fortress-cities: launching daily raids, destroying virus clusters, passing leftover supplies over the wall to civilians, and retreating behind the wire by nightfall — then repeating operations at first light.",
      ticker: "Fortress-cities on the border · Daily raids · Supplies over the wall · Behind the wire by dark" },
    { id: "19.22", phase: 4, channel: "NNC · NATIONAL REPORT",
      headline: "The Final Safe Zones",
      body: "These are the last functioning regions of the country: New York City, the Washington interior, the Oregon interior, Idaho, Montana, Wyoming, Colorado, Utah, the Nevada interior, the Arizona interior, New Mexico, Texas, Oklahoma, Kansas, Nebraska and Iowa. Everything else is contested, collapsed, or gray.",
      ticker: "FINAL SAFE ZONES: NYC · WA/OR/NV/AZ interiors · ID · MT · WY · CO · UT · NM · TX · OK · KS · NE · IA" },
    { id: "19.23", phase: 4, channel: "NNC · SIGNING OFF",
      headline: "This Is Our Last Full Broadcast",
      body: "If you are inside a Gray Zone… you are on your own. If you are inside a Safe Zone… remain indoors. Avoid all contact. This is our last full broadcast. To everyone still out there — [the anchor's voice breaks] — good night, and good luck.",
      ticker: "· · · this is our last full broadcast · · · good night · · · good luck · · ·",
      on(g) { g.player.addStress(5); } },

    { id: "19.24", phase: 4, channel: "· · · SIGNAL · · ·", special: "static",
      headline: "▓▓ SIGNAL DISTORTION ▓▓",
      body: "Static swallows the screen. Distorted voices bleed through — too slow, too many, overlapping. An emergency tone loops beneath them and will not stop.",
      ticker: "▓▓▓ distorted voices ▓▓▓ tone looping ▓▓▓" },
    { id: "19.25", phase: 4, channel: "EAS · FINAL", special: "emergency",
      headline: "⚠ EASTERN COAST UNDER FULL QUARANTINE ⚠",
      body: "The Eastern Coast is under full quarantine. No further broadcasts will be transmitted. This message will now repeat until the signal ends.",
      ticker: "⚠ FULL QUARANTINE ⚠ NO FURTHER BROADCASTS ⚠" },
    { id: "19.26", phase: 4, channel: "NO SIGNAL", special: "black",
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
     COMPUTER HUB CONTENT — the main device.
     Friend text threads (with typed replies), apocalypse
     newspapers, virus-spread reports, and a social feed.
     ------------------------------------------------------------ */

  // Direct-message threads. `thread` lines unlock as the national
  // phase rises; the player can reply (typed or quick), which appends
  // their message plus this contact's canned answer.
  const MESSAGES = [
    { id: "priya", from: "Priya", color: "#c05a8a",
      reply: "ok. ok. just keep talking to me. don't go quiet on me tonight 🖤",
      thread: [
        { phase: 0, text: "did the office email you? half of downtown called out sick lol" },
        { phase: 1, text: "ok this isn't funny anymore. they're saying don't leave the house??" },
        { phase: 2, text: "they SEALED my block. national guard on every corner. im scared" },
        { phase: 3, text: "power keeps cutting. i can hear helicopters. are you seeing this" },
        { phase: 4, text: "[image failed to send] …they cleared the building next to mine. lights off. i love you" },
      ] },
    { id: "marcus", from: "Marcus", color: "#4a7ac0",
      reply: "good. lock everything. do NOT open that door for anyone, i mean it.",
      thread: [
        { phase: 0, text: "yo you good? my cousin at the hospital says they're slammed" },
        { phase: 1, text: "curfew's real. 9pm. this is actually happening huh" },
        { phase: 2, text: "shelter in place just hit my phone. you barricaded yet?" },
        { phase: 3, text: "martial law downtown. don't trust the soldiers man. stay put" },
        { phase: 4, text: "if you're reading this i made it to the compound on 4th. come if you can move" },
      ] },
    { id: "mom", from: "Mom", color: "#c0894a",
      reply: "I love you more than anything. Stay in the dark. Wait for the light. 💛",
      thread: [
        { phase: 0, text: "Did you eat? There's soup in the freezer. Call me tomorrow." },
        { phase: 1, text: "Sweetheart the news is scaring me. Lock your doors. Please answer." },
        { phase: 2, text: "I can't reach your father. The lines keep dropping." },
        { phase: 3, text: "If a soldier comes to your door DON'T go with them. Promise me." },
        { phase: 4, text: "Whatever happens tonight, I'm so proud of you. [SENT 1 of 1]" },
      ] },
    { id: "unknown", from: "UNKNOWN", color: "#7a7a7a",
      reply: "…who is this. how did you get this number.",
      thread: [
        { phase: 3, text: "wrong number probably but — if you're near 4th & Pine there's a wall going up. get inside it." },
        { phase: 4, text: "gate closes at dawn. after that nobody gets in. your call." },
      ] },
  ];

  // Apocalypse newspapers, unlocked per national phase.
  const NEWSPAPERS = [
    [{ paper: "THE DAILY LEDGER", date: "LATE EDITION", head: "Cruise Ship Held Off Coast Over 'Flu-Like' Illness",
       byline: "by R. Halvorsen, Health Desk",
       body: "A luxury liner returning from the Atlantic has been denied port after dozens of passengers reported fever, confusion, and severe dehydration. The CDC calls it 'a routine precaution.' Passengers describe a scene that sounds anything but routine." }],
    [{ paper: "THE DAILY LEDGER", date: "MORNING EDITION", head: "'PECLIP VIRUS' NAMED AS CASES JUMP TO 400",
       byline: "by R. Halvorsen, Health Desk",
       body: "Health officials have named the pathogen the Peclip Virus as clusters appear in three coastal states. A 9 p.m. curfew takes effect tonight. 'Wash your hands and stay calm,' the governor said, in a statement that reassured no one." },
     { paper: "CITY TRIBUNE", date: "EXTRA", head: "Doctors Describe 'Impossible' Symptoms",
       byline: "by M. Okafor",
       body: "Physicians report patients whose tissue is visibly decaying while they remain awake and violent. 'They don't respond to pain,' one ER nurse said before hanging up." }],
    [{ paper: "CITY TRIBUNE", date: "OUTBREAK EDITION", head: "SHELTER IN PLACE — NEIGHBORHOODS SEALED",
       byline: "Staff Report",
       body: "Quarantine zones now ring the infected districts. Residents describe being trapped behind hasty barricades as the National Guard withdraws to defensive lines. Looting has begun in the eastern wards." },
     { paper: "THE DAILY LEDGER", date: "SPECIAL", head: "GOVERNMENT FAILS TO CONTAIN SPREAD, SOURCES SAY",
       byline: "by R. Halvorsen",
       body: "Internal memos suggest containment collapsed 48 hours ago. 'We are past prevention,' an unnamed official wrote. 'We are into triage now.'" }],
    [{ paper: "CITY TRIBUNE", date: "FINAL PRINT RUN", head: "MARTIAL LAW: THE SOLDIERS OWN THE STREETS",
       byline: "Staff Report",
       body: "Military units now hold the district. Evacuation corridors are collapsing one by one. This is the last edition our presses will run. Whoever finds this — good luck." }],
    [{ paper: "THE UNDERGROUND SHEET", date: "PHOTOCOPIED · GRAY ZONE", head: "THE WALL IS FINISHED. WE ARE INSIDE IT.",
       byline: "— whoever's still typing",
       body: "No government. No rescue. The militias hold the blocks and the choppers burn the clusters at dawn. If you're reading this on a screen that still turns on, you're one of the lucky few. Keep it that way." }],
  ];

  // Virus-spread situation reports (per national phase).
  const VIRUS_REPORTS = [
    [{ title: "CDC SITREP 001 — CONTAINMENT", body: "Confirmed cases: ~50, single vector (maritime). Transmission: unknown. Mortality: under review. Public risk: LOW. Recommendation: standard hygiene." }],
    [{ title: "CDC SITREP 014 — ELEVATED", body: "Confirmed cases: ~2,400 across 3 states. Transmission: bite / fluid contact, R0 estimated >6. Incubation: under 24h. Public risk: HIGH. Curfew advised." }],
    [{ title: "CDC SITREP 037 — SEVERE", body: "Estimated cases: 90,000+. Vector now airborne-adjacent in dense clusters. Hosts remain mobile post-mortem-onset. Public risk: SEVERE. Shelter in place mandatory." }],
    [{ title: "FEMA SITREP 061 — CRITICAL", body: "Cases uncountable. Eastern seaboard command lost. Military engaged intra-urban. Evacuation corridors 40% collapsed. Public risk: CRITICAL." }],
    [{ title: "SITREP ——— [SIGNAL DEGRADED]", body: "No reliable count. Eastern Coast designated loss. Gray Zones sealed. Containment sweeps authorized at first light. This is the final automated report." }],
  ];

  // Social feed — a scroll of posts that curdles with the phase.
  const SOCIAL = [
    { phase: 0, user: "brunchbella", handle: "@bella_eats", text: "cruise ship drama off the coast 👀 imagine paying $4k to get quarantined lmaooo" },
    { phase: 0, user: "TechFinance", handle: "@tf_daily", text: "Markets shrug off 'health scare.' Analysts say buy the dip." },
    { phase: 1, user: "nurse_on_shift", handle: "@rn_amara", text: "i have never seen the ER like this. please. stay home. i'm begging you." },
    { phase: 1, user: "ScannerFeed", handle: "@city_scanner", text: "MULTIPLE 10-54s downtown. 'subjects not responding to commands.' curfew confirmed 9pm." },
    { phase: 2, user: "prepper_pete", handle: "@pete_ready", text: "TOLD. YOU. ALL. barricade your doors NOW. this is not a drill. #Peclip" },
    { phase: 2, user: "mama_of_three", handle: "@jen_h", text: "they sealed our street. kids are scared. we have 2 days of food. praying." },
    { phase: 3, user: "rooftop_survivor", handle: "@last_light", text: "helicopters all night. gunfire on 5th. if you see soldiers DO NOT go with them" },
    { phase: 3, user: "ScannerFeed", handle: "@city_scanner", text: "[FEED INTERRUPTED]" },
    { phase: 4, user: "compound_4th", handle: "@fourth_st", text: "gate closes at dawn. lights off, move quiet, knock the pattern. we have soup and a wall. that's everything now." },
    { phase: 4, user: "———", handle: "@———", text: "░░░░ can anyone still ░░░░ read this ░░░░" },
  ];

  /* ------------------------------------------------------------
     SLUM DISTRICT CONTENT — Mumbai/Dharavi and sister districts.
     A cheap TV with its own reporter, a battery FM radio, a group
     chat where you know everyone — and the lore: the water is so
     polluted and the air so dirty that ordinary infected DIE out
     here. They float down the Mithi. Only the trash-adapted
     ("kachra walkers") survive. The government cordons the wards…
     and then discovers the slum is winning.
     ------------------------------------------------------------ */
  const SLUM_TV_TIMELINE = [
    // ---- phase 0 ----
    { id: "M1", phase: 0, channel: "BHARAT 24x7 · MORNING",
      headline: "Monsoon Eases; Local Trains Back On Schedule",
      body: "Good morning, Mumbai. The rains have eased, the Central Line is running on time for once, and onion prices are down. A calm week ahead, God willing.",
      ticker: "Trains on time · Onion prices dip · Air quality: poor (as usual)" },
    { id: "M2", phase: 0, channel: "BHARAT 24x7 · WORLD",
      headline: "Foreign Cruise Ship Quarantined Over Mystery Illness",
      body: "In world news: a cruise liner in the Atlantic reports a strange illness — fever, confusion, dehydration. Health Ministry officials say there is no cause for concern in India. Screening continues at all ports.",
      ticker: "Cruise illness overseas · 'No cases in India' · Port screening routine" },
    // ---- phase 1 ----
    { id: "M3", phase: 1, channel: "BHARAT 24x7 · BREAKING",
      headline: "First Peclip Cases Confirmed at Mumbai Port",
      body: "Breaking: three dock workers at Mumbai Port Trust have tested positive for the Peclip Virus. The Health Ministry has issued an advisory: masks, distance, report fever immediately. Thermal screening begins at all stations and airports.",
      ticker: "3 cases at the port · Ministry advisory issued · Thermal screening at stations" },
    { id: "M4", phase: 1, channel: "BHARAT 24x7 · HEALTH",
      headline: "Hospitals on Alert; Wards Prepare Isolation Beds",
      body: "Civic hospitals are converting wards to isolation units. Doctors describe patients who grow violent and confused within a day. The BMC urges citizens: do not crowd the hospitals, do not touch the sick, wash your hands.",
      ticker: "Isolation wards ready · 'Violent confusion' in patients · BMC: do not crowd hospitals" },
    { id: "M5", phase: 1, channel: "BHARAT 24x7 · CITY",
      headline: "City on Edge as Cases Spread Along the Harbour Line",
      body: "Cases are following the railway lines north. Colaba and Fort report incidents. The Chief Minister appeals for calm and announces a task force. In the lanes, the aunties have already started their own count.",
      ticker: "Cases along Harbour Line · CM appeals for calm · Task force announced" },
    // ---- phase 2 ----
    { id: "M6", phase: 2, channel: "BHARAT 24x7 · EMERGENCY",
      headline: "JANATA CURFEW: Trains Stopped, City Locked Down",
      body: "The government has declared a full janata curfew. Local trains — the city's lifeline — have stopped. Section 144 is in force across Greater Mumbai. Stay in your homes. Stay in your lanes. Police will patrol with loudspeakers.",
      ticker: "JANATA CURFEW · Locals stopped · Section 144 citywide · Stay in your lanes" },
    { id: "M7", phase: 2, channel: "BHARAT 24x7 · BMC",
      headline: "Southern Wards SEALED as Infection Spreads",
      body: "The BMC has sealed Colaba, Fort and Byculla behind barricades. Ration shops get police guards. Water tankers are being escorted. Officials say the sealing will hold. The lanes know better than to wait for officials.",
      ticker: "South wards sealed · Ration shops guarded · Tankers under escort" },
    { id: "M8", phase: 2, channel: "BHARAT 24x7 · DEFENCE",
      headline: "Army Conducts Flag Marches Through the City",
      body: "Army columns are marching through the main roads — a show of control as the police thin out. Helicopters sweep the coastline. The Chief Minister's address tonight was cut short by technical difficulties. Nobody believes that.",
      ticker: "Army flag marches · Helicopters on the coast · CM address cut short" },
    // ---- phase 3 ----
    { id: "M9", phase: 3, channel: "BHARAT 24x7 · CORDON",
      headline: "Army Cordons the Dense Districts — Including Yours",
      body: "The army has thrown a cordon around the dense districts: Dharavi, and lanes like it. Nobody in, nobody out. Rations over the wire twice a week. Inside, the community watch organizes rotas: who guards, who cooks, who listens to the radio.",
      ticker: "CORDON around the district · Nobody in or out · Rations over the wire",
      on(g) { g.flags.soldiersOutside = true; setTimeout(() => { g.flags.soldiersOutside = false; }, 16000); } },
    { id: "M10", phase: 3, channel: "BHARAT 24x7 · MITHI",
      headline: "Bodies of Infected Found FLOATING in the Mithi River",
      body: "Disturbing and strange: dozens of infected have been found dead — not destroyed, just dead — floating down the Mithi river. Doctors are baffled. The infected walked into the water… and simply stopped. More float past every hour.",
      ticker: "Infected found DEAD in the Mithi · 'They just… stopped' · More every hour",
      on(g) { g.toast("You can see them from the window now. Pale shapes, drifting with the current."); g.player.addStress(6); } },
    { id: "M11", phase: 3, channel: "BHARAT 24x7 · SCIENCE",
      headline: "Doctors: The Pollution Is KILLING the Virus",
      body: "KEM Hospital researchers confirm the impossible: the Peclip Virus cannot survive our water or our air. The contamination that has poisoned these lanes for generations is burning the infection out of every host it touches. The city's curse has become its shield.",
      ticker: "POLLUTION KILLS THE VIRUS · Hosts dying within hours · 'Our curse is our shield'",
      on(g) { g.player.addStress(-6); g.toast("The lane erupts — people banging pots, laughing, crying. The filth is fighting for you."); } },
    { id: "M12", phase: 3, channel: "BHARAT 24x7 · RELIEF",
      headline: "Helicopters Drop Rations Inside the Cordons",
      body: "Army helicopters are dropping ration crates into the cordoned districts. The government requests: hold your lanes, boil your water, and report any infected that still walk — especially those seen climbing from the garbage.",
      ticker: "Ration drops begin · Boil your water · Report the ones from the garbage",
      on(g) { g.flags.helicopter = true; g.audio.helicopterPass(); } },
    // ---- phase 4 ----
    { id: "M13", phase: 4, channel: "BHARAT 24x7 · ICMR",
      headline: "ICMR CONFIRMS: Only the 'Kachra Walkers' Survive",
      body: "The ICMR has confirmed what the lanes already knew. Ordinary infected die within hours here. But some — the ones that burrow into the garbage heaps, wrapped in refuse — have adapted. The trash shields them like a second skin. They are slower. They are patient. They are the only ones left.",
      ticker: "KACHRA WALKERS confirmed · The trash shields them · Slow, patient, still hungry",
      on(g) { g.player.addStress(7); g.toast("The heap across the lane shifted just now. Probably the wind. Probably."); } },
    { id: "M14", phase: 4, channel: "BHARAT 24x7 · DIRECTIVE",
      headline: "Dense Districts Declared 'Attrition Zones' — HOLD",
      body: "The government's final directive for the cordoned districts: HOLD. Do not break the cordon. Every day you hold, the environment kills more of them. Estimates say the virus will burn itself out of the city within days. The lanes that hold together, survive together.",
      ticker: "ATTRITION ZONE · HOLD YOUR LANE · The virus is burning out · Days, not weeks" },
    { id: "M15", phase: 4, channel: "BHARAT 24x7 · SIGN-OFF",
      headline: "This Studio Is Going Dark. The Radio Will Carry On.",
      body: "We are handing over to the community radio network. To every lane still holding: you were never the weak point of this city. You were its immune system. Hold. [the anchor presses her palms together] Jai Hind.",
      ticker: "TV signing off · FM 92.7 takes over · 'You were the immune system' · Jai Hind" },
    { id: "M16", phase: 4, channel: "· · · SIGNAL · · ·", special: "static",
      headline: "▓▓ NO SIGNAL ▓▓",
      body: "Static. Somewhere under it, faintly, the community radio is still talking. The TV is done. The lane is not.",
      ticker: "· · · FM 92.7 still broadcasting · · ·" },
  ];

  // The battery radio — keeps working when everything else dies.
  const SLUM_RADIO = [
    [{ time: "FM 92.7", text: "Namaste, this is Galli Radio. Nothing to report except Sharma-ji's rooster, which has again defeated everyone's sleep. Boil your water anyway. It's good practice." }],
    [{ time: "FM 92.7", text: "Port cases confirmed. Listen: masks when you go to the tap, no crowding at Ganesh's shop, and if anyone has fever — the AUNTIES will know before the BMC does. Report to them." }],
    [{ time: "FM 92.7", text: "Curfew is real, trains are stopped. Rota is posted at the temple wall: watch shifts, cooking shifts, water shifts. Nobody stands alone. Nobody sleeps alone. That is how the lane works." },
     { time: "FM 92.7", text: "Police loudspeakers say stay inside. Fine. But keep the back paths clear between houses — aunty network says the sealed wards are already using them." }],
    [{ time: "FM 92.7", text: "You've seen the river. They walk in and they stop. Whatever is in our water — and brothers, we always knew SOMETHING was in our water — it kills them. The floaters are proof the lane can outlive this." },
     { time: "FM 92.7", text: "KEM doctors on the wire: the air, the water, the filth — the virus can't take it. Hosts drop in hours. Only warning: stay away from the HEAPS. The ones wrapped in kachra are lasting longer." }],
    [{ time: "FM 92.7", text: "Final word from the government: HOLD. Every day we hold, the environment kills more of them. Kachra walkers are slow — bang your pots if you see a heap move, and the watch will come running." },
     { time: "FM 92.7", text: "TV's gone dark. It's just us now. Chai at the corner at dawn for whoever's on watch. The lane holds together, the lane survives together. Galli Radio, staying on air." }],
  ];

  // Threads on the cheap phone — you know everyone.
  const SLUM_MESSAGES = [
    { id: "galli", from: "Galli Group 👥", color: "#2a9db0",
      reply: "Ravi: we're all here yaar. nobody sleeps alone tonight 💪 Sana: chai's on. Meera: 🙏",
      thread: [
        { phase: 0, text: "Arjun: who left slippers on MY step 😂 · Sana: cricket at 6, losers buy vada pav" },
        { phase: 1, text: "Meera: aunty network says 3 cases at the port. REAL ones. masks from tomorrow, no arguments" },
        { phase: 2, text: "Ravi: trains stopped. rota posted at temple wall. our house takes night watch tuesday · Sana: my cousin's ward got SEALED" },
        { phase: 3, text: "Arjun: DID YOU SEE THE RIVER. they just DIE here. Meera: the water fights for us 🙏 Ravi: stay off the heaps though. seriously." },
        { phase: 4, text: "Sana: kachra walker pulled out of heap near pipe road, watch got it with rods. everyone fine. BANG YOUR POTS if you see one · Ravi: hold the lane 💪" },
      ] },
    { id: "amma", from: "Amma (village)", color: "#c0894a",
      reply: "Eat properly. Boil the water twice. The whole village is praying for your lane. 💛",
      thread: [
        { phase: 0, text: "Did you eat? Send money only if you can. The buffalo is sick again." },
        { phase: 1, text: "The TV says sickness in your city. Wear the mask I stitched you. ANSWER YOUR PHONE." },
        { phase: 2, text: "They stopped the trains?? Beta come home. Walk if you must. Everyone is coming home." },
        { phase: 3, text: "The village heard about the river. God is in your dirty water, beta. Stay with your friends." },
        { phase: 4, text: "Hold on. The radio says your lanes are winning. I always said the city couldn't kill you. Neither can this." },
      ] },
    { id: "bhaiya", from: "Landlord Bhaiya", color: "#7a7a7a",
      reply: "Rent can wait. Roof can't. I'm sending boys with boards — my building, my people.",
      thread: [
        { phase: 1, text: "Rent by Friday. Also tell Ravi the tap on 2nd lane is MINE to fix, not his." },
        { phase: 2, text: "Forget Friday. Water drums on every floor by tonight. My boys are filling them. Don't fight over it." },
        { phase: 3, text: "Cordon is at the main road. Back paths still open between my buildings. Only for the watch. You didn't hear this from me." },
        { phase: 4, text: "40 years I collected rent in this lane. Nobody dies in my buildings this week. Boards, rods, and my boys are on the roof. HOLD." },
      ] },
  ];

  // Government SMS blasts — Indian response arc.
  const SLUM_ALERTS = [
    [{ level: "ADVISORY", text: "MoHFW: Foreign cruise illness under observation. No cases in India. Routine port screening in effect. Do not spread rumours. #IndiaFightsPeclip" }],
    [
      { level: "WARNING", text: "MoHFW ALERT: Peclip cases confirmed at Mumbai Port. Wear masks. Report fever to 104. Thermal screening at all stations. Do not touch the sick." },
      { level: "WARNING", text: "BMC: Isolation wards activated at KEM, Sion, JJ hospitals. Do not crowd hospital gates. Ambulances only." },
    ],
    [
      { level: "CRITICAL", text: "GOVT OF MAHARASHTRA: JANATA CURFEW in force. Section 144 citywide. Local trains suspended. Stay in your homes. Police patrols with loudspeakers." },
      { level: "CRITICAL", text: "BMC: Southern wards SEALED. Ration shops under guard. Water tankers escorted. Boil all drinking water." },
    ],
    [
      { level: "CRITICAL", text: "ARMY SOUTHERN COMMAND: Cordon established around dense districts incl. Dharavi. No movement in or out. Ration drops twice weekly. Cooperate with community watch." },
      { level: "CRITICAL", text: "ICMR BULLETIN: Infected hosts expiring on contact with contaminated water/air. If confirmed, this changes everything. Continue to HOLD." },
    ],
    [
      { level: "CRITICAL", text: "ICMR CONFIRMED: Environment lethal to the virus. Surviving infected are refuse-adapted ('kachra walkers') — slow, resilient. Avoid all garbage heaps. Bang metal to alert the watch." },
      { level: "CRITICAL", text: "FINAL DIRECTIVE: Dense districts are ATTRITION ZONES. Hold your lanes. Estimated burnout: days. The lanes that hold together survive together. Jai Hind." },
    ],
  ];

  // Physical newspapers — someone has to HAND you these in the lane.
  const SLUM_NEWSPAPERS = [
    { phase: 0, paper: "DAINIK SAMACHAR", date: "MORNING EDITION", head: "Videsh Mein Cruise Ship Par Rahasyamayi Bimari",
      byline: "PTI wire, page 7, under the cricket scores",
      body: "A foreign cruise liner reports a strange illness. The Health Ministry says there is no cause for concern in India. In other news: the monsoon has eased, and the BMC promises the potholes on 90 Feet Road will be filled 'shortly.'" },
    { phase: 1, paper: "DAINIK SAMACHAR", date: "SPECIAL", head: "PECLIP VIRUS REACHES MUMBAI PORT — 3 DOCK WORKERS POSITIVE",
      byline: "by S. Kadam, City Desk",
      body: "Thermal screening at every station. Masks in every queue. An unnamed BMC officer: 'We handled worse with less.' The aunties of the dense districts have organised their own fever registers — faster, sources say, than the official one." },
    { phase: 2, paper: "DAINIK SAMACHAR", date: "CURFEW EDITION", head: "TRAINS STOPPED. CITY SEALED. LANES ON THEIR OWN.",
      byline: "by S. Kadam, City Desk",
      body: "The lifeline is cut: no locals, no buses, Section 144 everywhere. Southern wards are behind barricades. This paper is now printed on one press and carried by hand. If a boy in slippers hands you this — thank him, and give him a biscuit." },
    { phase: 3, paper: "DAINIK SAMACHAR", date: "HAND PRESS", head: "THE RIVER IS KILLING THEM — DOCTORS CONFIRM THE IMPOSSIBLE",
      byline: "final city edition",
      body: "The infected walk into the Mithi and stop. KEM researchers confirm the water and the air burn the virus out of every host within hours. Only the ones wrapped in refuse survive. Sixty years the city called these lanes a disease. The lanes turned out to be the cure." },
  ];

  // Chotu's side-quests — the lane's nine-year-old courier network.
  const CHOTU_QUESTS = [
    { id: "meds", ask: "Uncle! Aunty needs her BP medicine from the chemist's cousin, three lanes over. Give me one tiffin for the run and I'll bring your share of watch rations back. Deal?",
      yesLabel: "GIVE HIM A MEAL (1 FOOD)", noLabel: "NOT TODAY, CHOTU",
      cost: 1, delay: 50,
      done: "Chotu is back, breathing like a small train — medicine delivered, and the watch sent your ration share: two full tins!",
      reward(g) { g.addSupplies(2); g.player.addStress(-8); } },
    { id: "paper", ask: "Uncle! The press-wala printed papers BY HAND today. One biscuit and I'll bring you a copy before anyone else in the lane has read it. Deal?",
      yesLabel: "GIVE HIM A BISCUIT (1 FOOD)", noLabel: "NOT TODAY, CHOTU",
      cost: 1, delay: 40,
      done: "Chotu slaps a folded newspaper into your hands like a relay baton. 'READ IT, uncle!' — the news app on your phone can open it now.",
      reward(g) { g.papersHave = (g.papersHave || 0) + 1; g.unread.news++; g.player.addStress(-4); } },
    { id: "boards", ask: "Uncle! Landlord Bhaiya's boys have extra boards but their runner is sick. I know the way. One meal for the trip and they'll board YOUR door first. Deal?",
      yesLabel: "PACK HIM FOOD (1 FOOD)", noLabel: "NOT TODAY, CHOTU",
      cost: 1, delay: 60,
      done: "Heavy knocking — Bhaiya's boys, with boards. 'Chotu said you first.' Your door frame gets an extra plank, professionally nailed.",
      reward(g) { g.barricades.door = Math.min(3, g.barricades.door + 1); g.player.addStress(-5); } },
  ];

  /* ------------------------------------------------------------
     THE REPLY BRAIN — context-aware chat responses.
     Each contact understands intents; warmth grows with bond
     (how often you actually talk to them).
     ------------------------------------------------------------ */
  const BRAINS = {
    priya: {
      ok: ["ok good. GOOD. keep it that way 🖤", "promise me that stays true"],
      love: ["…you picked a hell of a week to finally say that 🖤", "i love you too. survive this and tell me in person"],
      fear: ["hey. breathe. in for 4, out for 4. i'm right here on the other end", "scared is smart right now. just don't open that door"],
      food: ["eat SOMETHING. even crackers. you get mean when you're hungry", "i had cold rice for dinner. we feast when this is over"],
      zombie: ["do NOT go look at it. i know you. do not.", "they're slow, you're smart, the door is locked. math says you win"],
      question: ["still here. block's quiet tonight. helicopter woke me at 3", "alive, annoyed, drinking bad tea. you?"],
      warm: ["you know you're the only one who still texts back? don't stop 🖤"],
      default: ["ok. ok. just keep talking to me. don't go quiet on me tonight 🖤", "tell me something boring. i miss boring"],
    },
    marcus: {
      ok: ["good. stay boring, stay alive", "that's what i want to hear. check your locks anyway"],
      love: ["yeah yeah love you too man. BARRICADE THE WINDOWS", "we're getting a beer after this. both of us. that's a promise"],
      fear: ["fear keeps you sharp. panic gets you killed. you're sharp", "lock it down and breathe, brother"],
      food: ["ration it. two meals a day max. trust me", "my cousin says the relief trucks skip small streets. stretch what you got"],
      zombie: ["do not engage. you're not the hero of this movie, you're the survivor", "saw two on 8th street. slow. blind-ish at night. stay dark"],
      question: ["holding. boarded the back door today. you?", "compound's solid. wall's taller than me now"],
      warm: ["when this is done you're moving closer. i'm not doing this long-distance apocalypse thing again"],
      default: ["copy that. eyes open, lights low", "keep me posted. i mean it"],
    },
    mom: {
      ok: ["Thank God. I sleep when you answer, you know.", "Good. Now eat something warm and prove it."],
      love: ["I love you more than anything in this world. 💛", "My whole heart. Stay inside it."],
      fear: ["Breathe, sweetheart. Fear is just love with nowhere to go. Put it in the barricades.", "You come from stubborn people. Be stubborn tonight."],
      food: ["There is ALWAYS soup if you look properly.", "Eat the good things first, they spoil. The cans keep."],
      zombie: ["Don't you dare open that door for anything that doesn't say your name.", "Your grandmother survived worse with less. So will you."],
      question: ["I'm fine, the street is quiet, Mrs. Chen sends her love.", "We're managing. Don't worry about me — worry about breakfast."],
      warm: ["You've messaged me every day. Whatever happens — you were a good one. The best one."],
      default: ["I'm here. I'm always here. 💛", "Answer again in the morning so I can sleep."],
    },
    unknown: {
      ok: ["good for you.", "then you're luckier than this block."],
      fear: ["everyone's scared. the smart ones use it.", "then don't come to 4th & Pine soft. come ready."],
      zombie: ["they follow sound. remember that.", "the uniforms are worse. remember that too."],
      question: ["who i am doesn't matter. what i said does.", "gate. dawn. your call."],
      default: ["…", "wrong number. right advice. take it."],
    },
    galli: {
      ok: ["Ravi: GOOD 💪 Sana: chai when your shift ends · Meera: 🙏", "Arjun: that's the spirit yaar. lane strong 💪"],
      love: ["Sana: awww 🖤 Ravi: ok ok family family, NOW CHECK THE DOOR", "Meera: we love you too. Arjun: speak for yourself 😂 (we do)"],
      fear: ["Ravi: oi. FOUR of us are right here. count us. · Sana: making chai rn", "Meera: come sit on the mat, phone down · Arjun: fear is rent, we split it 5 ways"],
      food: ["Sana: aunty's tiffin round is at 6, hold on · Ravi: i have half a packet of Parle-G with your name on it", "Arjun: whoever ate my pickle owes me their next egg. yes this is a threat"],
      zombie: ["Ravi: heap moved?? BANG THE POT · Arjun: rods by the door, i counted", "Sana: watch cleared it, all fine · Meera: the water protects this lane 🙏"],
      question: ["Ravi: all five accounted for 💪 · Sana: rota says you're on water duty btw", "Arjun: lane's quiet. Chotu says the far heap 'looked at him'. it's Chotu tho"],
      warm: ["Ravi: you know what, this house got LUCKY when you moved in · Sana: agreed · Meera: 🖤 · Arjun: rent's still split evenly tho"],
      default: ["Ravi: we're all here yaar. nobody sleeps alone tonight 💪", "Sana: chai's on. · Meera: 🙏"],
    },
    amma: {
      ok: ["Then my prayers are working. I'll send more anyway.", "Good. Now drink water. BOILED water."],
      love: ["My child. The whole village lights a diya for your lane. 💛", "I love you across every kilometre of this country."],
      fear: ["You were born in a monsoon, beta. You don't drown easy.", "Hold your friends close. God lives in crowded rooms."],
      food: ["Eat what aunty brings. Aunties are never wrong about food.", "When you come home I am making everything. EVERYTHING."],
      zombie: ["The dirty water God gave your city is cleaning it now. Trust it.", "Stay away from the garbage, beta. Even before all this I said that."],
      question: ["The village is safe. The buffalo recovered. Your room is ready.", "We are fine. The city ones came home walking. You hold on."],
      warm: ["Every day you message, I put one rupee in the temple box. It's getting heavy, beta. Keep it heavy."],
      default: ["Eat properly. Boil the water twice. The whole village prays for your lane. 💛"],
    },
    bhaiya: {
      ok: ["Hm. Good. My buildings, my people, all standing.", "Then check on the widow in 3B for me. Quietly."],
      fear: ["40 years in this lane. It has never once fallen. Not starting now.", "Scared? Good. Scared tenants check their locks."],
      food: ["Water drums are full on every floor. Food comes with aunty's round.", "If anyone hoards in MY building, tell me. I'll redistribute. Loudly."],
      zombie: ["My boys patrol the roofs at night. Nothing crosses my parapets.", "The heap ones are slow. My rods are not."],
      question: ["Rent? In THIS economy? Don't insult us both. Buildings first.", "Back paths clear as of this morning. You didn't hear it from me."],
      warm: ["You're the only tenant who asks how I am. When this ends, one month free. Tell NO ONE."],
      default: ["Rent can wait. Roof can't. My boys are around if you need boards."],
    },
  };

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
    exodus: {
      mood: "good", title: "THE LANE LEAVES TOGETHER",
      text: "At dawn the lorries come — arranged by the aunties, guarded by the watch, blessed at the temple wall. The whole lane climbs aboard together: Ravi, Sana, Arjun, Meera, the landlord's boys, Sharma-ji's rooster. You never once faced the night alone, and you don't leave alone either. The convoy rolls north, and the lane sings.",
    },
    holdfast: {
      mood: "good", title: "THE LANE HOLDS",
      text: "It ends the way the radio said it would: not with rescue, but with attrition. The floaters stopped coming days ago. The last kachra walker was pulled from the heap by the watch on Tuesday. The virus needed clean lungs and clean water, and your lane never had either to offer. The city's curse was its shield — and you held. Chai at the corner at dawn. Everyone's there.",
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

      // Slum districts: you know everyone. The knocking never stops,
      // and almost all of it is your own people — until the heaps move.
      if (game.zoneId === "slum") {
        if (phase >= 2 && roll < 0.14) return this._trashZombie();
        if (phase >= 1 && roll < 0.3) return this._sickNeighbor();
        if (roll < 0.55) return this._aunty();
        if (roll < 0.75) return this._laneKid();
        return this._communityWatch();
      }

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
          desc: "A tired-looking courier holds up a box of groceries. 'Late shift, sorry. Sign here?' Everything about it is completely, boringly ordinary.",
          yes: { stress: -3, supplies: +2, message: "You sign for the groceries — eggs, bread, a chicken. A moment of normalcy, and a fuller basket." },
          no: { stress: +3, message: "You wave them off through the peephole. They shrug and leave the box on the step, where you'll never quite dare to fetch it." },
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
        yes: { stress: -3, supplies: +1, message: "You crack the door. He repeats his warning, presses a ration pack into your hand, and moves on. Small mercy." },
        no: { stress: +2, message: "You answer through the door. 'Smart,' he says. 'Keep it that way.' His footsteps fade." },
      };
      return this._wrap(v, "soldier");
    },

    /* ---- slum lane visitors: you know every one of these faces ---- */
    _aunty() {
      const v = {
        sprite: "person", color: "#c05a8a",
        title: "PUSHPA AUNTY FROM TWO DOORS DOWN",
        desc: "It's Pushpa Aunty, holding a steel tiffin stacked three layers high. 'Beta, you five eat like sparrows. Open up — and tell Ravi the rota has him on water duty, he can't hide from me.'",
        yes: { stress: -7, supplies: +2, message: "Dal, rice, and her famous bhindi. She counts all five of you with her eyes, nods once, and moves to the next door. The lane feeds its own." },
        no: { stress: +4, message: "You call an excuse through the door. A long pause. 'Hm.' The single most terrifying syllable in the lane. She leaves the tiffin on the step." },
      };
      return this._wrap(v, "person");
    },

    _laneKid() {
      const v = {
        sprite: "person", color: "#3a9ac0",
        title: "CHOTU FROM THE CORNER",
        desc: "Chotu, age nine, official messenger of the lane, is bouncing on his heels. 'Uncle! Watch says check your water drums, and Sana-didi's team won cricket, and ALSO there was a noise from the big heap but Bablu says it was a cat. It wasn't a cat, uncle.'",
        yes: { stress: -5, message: "You give him a biscuit and he delivers the whole lane's news in ninety seconds flat, then sprints off. The lane's nervous system, in slippers." },
        no: { stress: +2, message: "'FINE, uncle.' He yells the news through the door anyway, all of it, then runs off. Information delivered. Dignity intact." },
      };
      return this._wrap(v, "person");
    },

    _communityWatch() {
      const v = {
        sprite: "person", color: "#3aa06a",
        title: "THE COMMUNITY WATCH",
        desc: "Two men from the watch with iron rods and a coil of rope. 'Rota check, brother. Your door good? We're boarding weak frames tonight — landlord's boys sent boards. Two minutes, no charge, no argument.'",
        yes: { stress: -5, repair: 1, message: "They brace your frame with a board in under two minutes, chalk a tick on the wall, and move on. The lane holds together because of exactly this." },
        no: { stress: +3, message: "'Your call. Bang a pot if anything moves near the heap.' The chalk tick on your wall stays blank. It bothers you more than it should." },
      };
      return this._wrap(v, "person");
    },

    _sickNeighbor() {
      const v = {
        sprite: "person", color: "#7a4a4a",
        title: "GANESH — AND HE LOOKS WRONG",
        desc: "Ganesh from the tap queue leans on your frame, sweating through his shirt. 'Brother… fever. Aunty's line is too long, the hospital is sealed. Let me sit inside one hour, that's all.' There is no clinic. There is no doctor. There is only your judgment.",
        yes: { stress: -1, risk: 0.35, message: "You sit him in the corner with water and a wet cloth. The fever breaks by evening — ordinary dengue-season fever, thank god. He grips your hand hard before he goes.", flags: { ally: true } },
        no: { stress: +11, message: "You keep it shut and call through the wood for the watch to fetch the aunty network. His footsteps shuffle away. You'll be checking on him tomorrow — from a distance." },
      };
      return this._wrap(v, "person");
    },

    _trashZombie() {
      const v = {
        sprite: "infected", color: "#5a6b4e",
        title: "SOMETHING FROM THE HEAP",
        desc: "It isn't knocking. It's leaning — a slow, wet weight against the door. Through the peephole: a shape wrapped in refuse, plastic and rag fused to grey skin, flies moving where a face should be. A kachra walker. The only kind the water couldn't kill.",
        yes: { ending: "infected", message: "You open the door. The trash shifts, and the thing inside it is faster than anything wrapped in garbage should be." },
        no: { stress: +9, message: "You bang a pot, hard, three times. Rods and shouting answer from up the lane — the watch drags it back to the heap it crawled from. Your hands don't stop shaking for a while." },
      };
      return this._wrap(v, "infected");
    },

    _exodus() {
      const v = {
        sprite: "person", color: "#2a9db0",
        title: "RAVI — THE LORRIES ARE HERE",
        desc: "Ravi's grin fills the peephole. 'It's ON. Aunties arranged lorries, watch cleared the back paths, cordon captain looked the other way. Whole lane goes at dawn — village side, clean air, Amma's district. EVERYONE goes. Grab the others and come!'",
        yes: { ending: "exodus", message: "You wake the house. Five of you, one lane, one convoy north." },
        no: { stress: +8, message: "'…You're staying? Then the watch keeps your rota slot open.' He grips your shoulder through the gap. 'The radio says the lane can outlast it. Prove it, brother.'" },
      };
      return this._wrap(v, "person");
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
        yes: { stress: +8, supplies: -2, risk: 0.12, message: "You crack the door and hand over eggs, cans, and your spare batteries. One of them actually writes it in a ledger. 'Wall's getting taller,' he says. Protection has a price now." },
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
          if (out.supplies && game.addSupplies) game.addSupplies(out.supplies);
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
      { id: "chai", minPhase: 0, weight: 4, zones: ["slum"], run(game) {
          game.player.addStress(-6);
          const lines = [
            "Sana presses a steel cup of chai into your hands without a word. It helps more than the barricades do.",
            "Ravi hums an old filmi song while fixing the stove. Meera joins in, terribly. The room feels human again.",
            "Arjun deals cards on the mat. 'Losers take the next water shift.' For twenty minutes, there is no outbreak.",
            "Meera reads Amma's message aloud to everyone. The whole room says 'boil the water twice' in unison and laughs.",
          ];
          game.toast(lines[Math.floor(Math.random() * lines.length)]);
        } },
      { id: "potbang", minPhase: 2, weight: 3, zones: ["slum"], run(game) {
          game.audio.thud();
          game.toast("Pots bang somewhere up the lane — the alarm. Then rods, shouting, and finally a cheer. The watch got it.");
          game.player.addStress(4);
        } },
      { id: "floaters", minPhase: 3, weight: 3, zones: ["slum"], run(game) {
          game.toast("More of them in the river today, drifting past like the city is exhaling. The radio counts them like a cricket score. The water is winning.");
          game.player.addStress(3);
        } },
      { id: "heapshift", minPhase: 3, weight: 3, zones: ["slum"], run(game) {
          game.audio.houseNoise();
          game.toast("The big heap across the lane shifts — a slow, deliberate settling that garbage doesn't do on its own. You keep your eyes on it until it stops.");
          game.player.addStress(7);
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
  ZH.Content = {
    TV_TIMELINE, GOV_ALERTS, PHONE_MSGS, ENDINGS, PHASES, ORDERS,
    MESSAGES, NEWSPAPERS, VIRUS_REPORTS, SOCIAL,
    SLUM_TV_TIMELINE, SLUM_RADIO, SLUM_MESSAGES, SLUM_ALERTS,
    SLUM_NEWSPAPERS, CHOTU_QUESTS, BRAINS,
  };
})(window.ZH = window.ZH || {});
