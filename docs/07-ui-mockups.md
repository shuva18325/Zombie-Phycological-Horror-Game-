# 7. Map Overview UI (Text Mockups)

The UI is **one map, many lenses**. The player never leaves the hex map; instead
they toggle **overlays** that recolor the same board to answer different
questions. Panels dock around the edges.

## 7.1 Main Screen Layout

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ☰  HexWorld Tycoon        Spring, Yr 3, Day 12   ⏸ 1× 2× 4×      🔔3  ⚙  💾    │  ← Top bar
├───────────────┬───────────────────────────────────────────────┬───────────────┤
│  OVERLAYS     │                                               │  MARKET TICKER │
│ ▸ Flow    🟩  │            ⬡   ⬡   ⬡   ⬡                       │ Crops  4.1 ▲   │
│ ▸ Connect ●   │          ⬡  [HQ] ⬡   ⬡   ⬡                     │ Crude 15.7 ▲   │
│ ▸ Pollution   │        ⬡   ⬡⟶⬡⟶⬡   ⬡   ⬡                       │ Fuel  33.1 ▼   │
│ ▸ Workers     │          ⬡   ⬡   ⬡⟶⬡   ⬡                       │ Metal 29.5 ═   │
│ ▸ Market      │            ⬡   ⬡   ⬡   ⬡                       │ Goods 44.0 ▲   │
│ ▸ Value       │                                               │ [Open Market] │
│               │   🟩 green line  🟨 yellow  🟥 red  ⟶ flow      │               │
│  LEGEND       │                                               │  ALERTS 🔔    │
│  🌾🌲🛢️⛏️💧🏭 │        (pan/zoom · click a hex to inspect)     │ ⚠ Oil#23 RED  │
│               │                                               │ ⚠ Strike risk │
├───────────────┴───────────────────────────────────────────────┴───────────────┤
│ 💰 $ 48,210   │ NW $ 1.24M   │ 👷 62/80   │ ☁ Pollution 210/1000 │ 🏆 Hexes 14/40 │  ← Status bar
└───────────────────────────────────────────────────────────────────────────────┘
```

**Reading it:** top bar = time & speed; left rail = overlay toggles + legend;
center = the living hex map; right rail = market ticker + alert feed; bottom =
the four win‑relevant meters (cash, net worth, workers, pollution) + hex count.

## 7.2 Overlay Set (the "lenses")

Each overlay recolors the same 60 hexes / lines to answer one question:

| Overlay | Recolors by | Answers |
|---------|-------------|---------|
| **Flow** 🟩 | Connection state (red/yellow/green) + animated flow arrows | "Where are my bottlenecks?" |
| **Connection Health** ● | Line health (bright→frayed) | "What's about to break?" |
| **Pollution** ☁ | Local pollution heat (blue→green→yellow→red) | "Where is my eco‑debt?" |
| **Workers** 👷 | Staffing % (empty→full) | "Where am I under/over‑staffed?" |
| **Market Influence** 📈 | Your share of each hex's resource on global market | "Where do I move prices?" |
| **Value / Strength** 💎 | Net income per hex (weak red → strong green) | "Which hexes carry me?" |

> Requested overlays — *strongest hexes (green), weakest (red), resource flow
> lines, connection health, pollution zones, worker distribution, market
> influence heatmap* — map 1:1 onto this set. **Strongest/weakest = Value
> overlay; flow lines & connection health = Flow + Health; pollution zones =
> Pollution; worker distribution = Workers; market influence heatmap = Market.**

## 7.3 Hex Inspector (click a hex)

```
┌──────────────── HEX #23  🛢️ Oil Field ─────────────────┐
│ Owner: YOU        Yield ★★★★★★★★☆☆ (8/10)  Reserve 71% │
│ Pollution ▓▓▓▓▓▓░░░░ 58/100  (⚠ neighbor bleed −6%)     │
│ Workers 4/6        Build slots (2/2 used)               │
│ Terraform L1        Spec: — [Specialize: Gusher +35%]   │
├─────────────────────────────────────────────────────────┤
│ BUILDINGS                                               │
│  • Oil Drill  L2   Eff 61%  Out 7.3→2.3 crude ⚠BACKED UP│
│  • Pump Stn   L1   Eff 88%  Out 8.0 water               │
├─────────────────────────────────────────────────────────┤
│ CONNECTION  Dirt ┄┄  🟥 RED  Quality 0.29  3 hops→HQ    │
│  Throughput 2.3/8   Health 0.9   [Upgrade ▸ Paved $450] │
│  ⓘ Building makes 7.3 but line carries 2.3. Upgrade line.│
├─────────────────────────────────────────────────────────┤
│ [Build ▾] [Upgrade Bldg] [Connect ▾] [Terraform] [Sell] │
└─────────────────────────────────────────────────────────┘
```

The inspector always shows the **produced → delivered** gap (`7.3→2.3`) and a
plain‑language nudge, so the connection lesson is never hidden in a menu.

## 7.4 Market Screen

```
┌──────────────────────────── MARKET ─────────────────────────────┐
│ Resource │ Price │ 1D  │ 7D sparkline      │ You supply │ Action │
│ Crops    │  4.1  │ ▲2% │ ▁▂▃▂▄▅▆            │  22%       │ [S][B] │
│ Crude    │ 15.7  │ ▲5% │ ▂▄▆█▆▅▇  (scarce)  │  41% ⚠     │ [S][B] │
│ Fuel     │ 33.1  │ ▼3% │ █▇▆▅▄▃▂ (glut you) │  63% ⚠⚠    │ [S][B] │
│ Metal    │ 29.5  │ ═   │ ▄▄▅▄▄▅▄            │  12%       │ [S][B] │
├──────────────────────────────────────────────────────────────────┤
│ FUTURES     Water  Δ+? drought risk 35%/7d   [Buy 6d @ 3.4 ▸]     │
│ EQUITIES    RustCo ▼   AgriGiant ▲   [Portfolio]  Regulator ▓▓░░░ │
│ SELL PANEL  Fuel  ▸ qty [ 120 ]  est $3,844 (−0.5% fee)           │
│             ⚠ selling 120 Fuel will move price −4% (you're 63%)   │
│             [ Confirm Sell ]   [ Spread over 6 ticks ]            │
└──────────────────────────────────────────────────────────────────┘
```

The **"selling will move price −4%"** warning operationalizes the self‑crash
mechanic (§6.4) right where the player acts.

## 7.5 Tech Tree Screen

```
┌────────────────────────── TECH TREE ─── RP: 1,240 ──────────────────────────┐
│  ERA 1 FARM  ──▶  ERA 2 EXTRACT ──▶ ERA 3 INDUSTRY ──▶ ERA 4 AUTOMATION      │
│                                                                              │
│  [✔ Agriculture]   [✔ Extraction]   [◐ Refining]     [ AI Logistics ]        │
│      │                  │                │                  │                 │
│  [✔ Irrigation]    [ Pumpjack ]    [ Consumer ]      [ Drone Delivery ]       │
│      │                  │                │                  │                 │
│  [ AgriTech ]      [ Deep Drill ]  [ Energy ]        [ Global Trade ]         │
│                                                                              │
│  Selected: ENERGY  (Cost 900 RP, 3 days)                                      │
│   Unlocks: Power Plant, +Hydroponics power, Renewable line (−pollution)       │
│   Prereq: Refining ✔    [ Research ▸ ]                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

`✔` researched · `◐` in progress · `[ ]` available/locked. Eras gate each other;
see [Progression §8](08-progression-tech-tree.md).

## 7.6 Event Popup

```
┌────────────── EVENT · DROUGHT ☀️🌵 ──────────────┐
│ A dry spell grips the region. (Severity: Major)  │
│                                                  │
│  • Crop production −35% for 6 days                │
│  • Water price ▲ up to +25%                       │
│  • Fire risk on Forest hexes +                    │
│                                                  │
│  RESPONSES                                        │
│   1) Ride it out            (free)                │
│   2) Emergency irrigation   (−$2,000, −half hit)  │
│   3) Buy Water futures now  (opens Market)        │
│                                                  │
│  Forecast accuracy: 82% (T2 Forecast tech)        │
│           [ Choose 1 ]  [ 2 ]  [ 3 ]              │
└──────────────────────────────────────────────────┘
```

Most events offer a **cost/mitigation choice** — events are decisions, not just
dice (see [Events §9](09-events.md)).

## 7.7 Notifications & Alert Feed

Alert types, priority‑sorted in the right rail:

| Icon | Class | Example | Urgency |
|:----:|-------|---------|:-------:|
| 🟥 | Bottleneck | "Oil #23 line RED — 68% output wasted" | High |
| ⚠ | Risk | "Worker morale 41% — strike risk rising" | High |
| ☁ | Pollution | "Global pollution 810/1000 — disaster nears" | Critical |
| 📈 | Market | "Fuel +12% this week — consider selling" | Med |
| 🤖 | Competitor | "RustCo acquired Hex #41 near you" | Med |
| 🏆 | Progress | "Net worth crossed \$1M!" | Low |

## 7.8 Accessibility  <a id="accessibility"></a>

- **Colorblind‑safe:** connection states carry **shape + pattern** in addition
  to hue — RED = `┄┄` dashed + ✕, YELLOW = `──` solid + △, GREEN = `═══` double
  + ✓. Overlays offer a "patterns" toggle.
- **Text scaling** and **high‑contrast** map theme.
- **Full pause‑planning:** the game can be fully driven while paused, so it is
  playable at any reaction speed.
- **Number formatting:** SI‑style (\$1.24M, 62k units) with exact values on hover.

---
[← Economy & Market](06-economy-stock-market.md) · [Next: Progression & Tech Tree →](08-progression-tech-tree.md)
