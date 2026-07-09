# 9. Events System

Events are the game's **weather** — literal and economic. They keep runs from
solving into autopilot. Most events are **decisions**, not just dice: they
present a mitigation choice with a cost.

## 9.1 Event Framework

Every event has:

| Field | Meaning |
|-------|---------|
| **Trigger** | What can cause it (timer, condition, roll). |
| **Base probability** | Per‑day chance (before modifiers). |
| **Severity** | Minor / Major / Catastrophic (scales the effect). |
| **Duration** | Ticks/days the effect persists. |
| **Effect** | Sim changes while active. |
| **Responses** | Player mitigation options (usually 2–3, cost vs. relief). |
| **Telegraph** | Warning lead time (raised by Forecast tech). |

**Scheduling:** at most **1 major** event pending at a time (a "director" avoids
piling on). Minor events can stack. A **cooldown** prevents the same event twice
in quick succession. Difficulty scales base probability & severity (Appendix F).

## 9.2 Event Categories

| Category | Examples | Feels like |
|----------|----------|-----------|
| **Natural** | Drought, Flood, Storm, Pest, Wildfire | Farming/logistics risk |
| **Economic** | Market crash, Boom, Tax change, Trade embargo | Market volatility |
| **Labor** | Strike, Migration wave, Skill shortage | Worker management |
| **Technical** | Machinery breakdown, Grid failure | Maintenance discipline |
| **Competitor** | Sabotage, Undercut, Takeover bid, Bidding war | Rival pressure (§10) |
| **Positive** | Bumper harvest, Subsidy, Investor windfall, Seasonal bonus | Reward/relief |

## 9.3 Response Design Principle

Good events give the player a **triangle of choices**:
1. **Eat it** (free, take the hit) — fine if you're diversified/hedged.
2. **Pay to soften** (cash now for reduced impact) — the "insurance" line.
3. **Trade around it** (use the market/futures) — the skill line, best ROI.

This rewards preparation (Forecast tech, hedging, green buffers) without ever
being unfair to a reactive player.

---

## Appendix B — Full Event Table  <a id="appendix-b--full-event-table"></a>

Probabilities are **per day at Standard difficulty**, before local modifiers.
"Mit." = representative paid mitigation.

### 🌦️ Natural

| Event | Base prob/day | Severity | Duration | Effect | Responses |
|-------|:-------------:|----------|:--------:|--------|-----------|
| **Drought** | 1.2% (×3 in Summer) | Major | 4–8 d | Crops −25→45%, Water price +25%, wildfire risk + | Ride out · Emergency irrigation (−\$2k, halves hit) · Long Water futures |
| **Flood** | 1.0% (×2 near Water/after storm) | Major | 2–4 d | Dirt roads health −0.4 (wash‑out), lowland hex prod −30%, pollution spreads | Ride out · Sandbag (−\$1.5k, protect roads) · Pre‑upgrade to rail/pipe |
| **Storm** | 1.5% | Minor–Major | 1–2 d | Connection health −0.15 network‑wide, outdoor prod −15% | Ride out · Reinforce (−\$800) |
| **Pest Infestation** | 0.9% (×2 monoculture) | Minor–Major | 3–6 d | Crops −20→40% on affected hexes | Ride out · Pesticide (−\$1.2k, +small pollution) · Crop rotation tech reduces base prob |
| **Wildfire** | 0.6% (×4 during drought) | Major–Catastrophic | 2–5 d | Forest hex prod →0, spreads to adjacent forest, pollution + | Ride out · Firebreak (−\$1.8k, stop spread) · Old‑Growth spec resists |
| **Cold Snap** | 1.0% (Winter only) | Minor | 2–4 d | All prod −10%, Fuel/Power demand +, water lines freeze (dirt) | Ride out · Heaters (−\$1k) |

### 💹 Economic

| Event | Base prob/day | Severity | Duration | Effect | Responses |
|-------|:-------------:|----------|:--------:|--------|-----------|
| **Market Crash** | 0.5% (rises with global overvaluation) | Major–Catastrophic | 5–10 d | All resource prices −20→40%; equities −; margin calls | Ride out · Sell before (needs Forecast) · Hedge with shorts/futures |
| **Commodity Boom** | 0.7% | Major | 4–8 d | One resource +30→60% price | Sell into it · Expand that resource · (positive) |
| **Tax Change** | Quarterly roll | Minor–Major | Until next quarter | Income tax ±5–15% or pollution levy introduced | Lobby (−\$, T‑Finance) · Restructure · Eat it |
| **Trade Embargo** | 0.4% (T4 Global Trade only) | Major | 6–12 d | Export routes closed; −25% on affected exports | Reroute domestic · Diversify markets |
| **Interest Rate Hike** | 0.6% | Minor–Major | until reversed | Loan interest +, credit tighter | Pay down debt · Refinance |

### 👷 Labor

| Event | Base prob/day | Severity | Duration | Effect | Responses |
|-------|:-------------:|----------|:--------:|--------|-----------|
| **Worker Strike** | 0.8% (×N if morale <45%) | Major | 2–6 d | Affected buildings 0–40% output; morale contagion | Negotiate raise (+wage) · Concessions (−\$, +morale) · Wait (risk spread) |
| **Migration Wave** | 0.5% | Minor (positive) | instant | +5–12 workers available to hire | Hire · Ignore |
| **Skill Shortage** | 0.6% | Minor | 3–7 d | Advanced buildings −15% eff | Training (−\$, T‑Auto reduces) |
| **Wage Inflation** | 0.5% | Minor | until reversed | Wages +8–15% | Automate (fewer workers) · Raise morale to offset |

### ⚙️ Technical

| Event | Base prob/day | Severity | Duration | Effect | Responses |
|-------|:-------------:|----------|:--------:|--------|-----------|
| **Machinery Breakdown** | 0.7% (×health decay, ×skipped maint) | Minor–Major | until repaired | One building →0% output | Repair (−0.4× cost) · Preventive maint (auto) |
| **Grid Failure** | 0.4% (Power‑dependent hexes) | Major | 1–3 d | Powered buildings (Hydroponics, automation) offline | Backup generator (−\$, +pollution) · Renewable redundancy |
| **Pipeline Rupture** | 0.3% (fluids, low health) | Major | 1–2 d | Fluid line 0 + local pollution spike | Emergency repair · Health discipline |

### 🏴 Competitor (see also §10)

| Event | Base prob/day | Severity | Duration | Effect | Responses |
|-------|:-------------:|----------|:--------:|--------|-----------|
| **Sabotage** | 0.5% (Aggressive/Chaotic AI) | Major | instant | A line/building health −0.5 or storage theft | Security (−\$/day) · Retaliate · Insurance payout |
| **Price Undercut** | 0.9% (Economic AI) | Minor–Major | 3–7 d | AI floods a resource → price −; your share hit | Out‑refine · Corner · Wait them out |
| **Hostile Takeover Bid** | condition (you own their shares / vice‑versa) | Catastrophic | — | AI attempts to buy control of your company or a hex | Buy back shares · Poison pill (T‑Finance) · Sell hex |
| **Bidding War** | on contested neutral hex | Minor–Major | instant | Auction price escalates | Outbid · Concede · Bluff |

### 🎁 Positive

| Event | Base prob/day | Severity | Duration | Effect |
|-------|:-------------:|----------|:--------:|--------|
| **Bumper Harvest** | 0.8% (Autumn ×2) | Minor | 1 harvest | Crop output +40% on farmland |
| **Government Subsidy** | 0.5% | Minor | instant | +\$ grant (scales with farm/eco footprint) |
| **Investor Windfall** | 0.4% | Minor | instant | Cash injection (or discounted credit) |
| **Seasonal Bonus** | Season start | Minor | 1 season | Themed buff (e.g., Spring +growth, Winter +fuel price) |
| **Tech Grant** | 0.4% | Minor | instant | +RP toward current research |

## 9.4 Pollution as an Event Driver (Diffusion)

Pollution is both a stat and an event engine. Each tick, per hex:

```
localPollution_t = clamp(
      localPollution_{t−1}
    + Σ(building emission)                      # positive emit / negative soak
    + 0.15 × Σ(neighborPollution − localPollution)   # diffusion in/out
    − ecoDecay(terrain, EcoUpgrades)            # natural + tech cleanup
  , 0, 100)

globalPollution = Σ localPollution / scale
```

- If `globalPollution > 800`: **Pollution Warning** event (repeats), morale −,
  government eco‑levy likely.
- If `globalPollution > POLLUTION_CAP (1000)`: **Pollution Disaster** → loss
  condition track (§12). This is a slow, telegraphed failure — the player has
  many days and clear signals to course‑correct with Eco/Renewable tech.

## 9.5 Forecasting & Telegraphs

| Tech | Telegraph gained |
|------|------------------|
| None | Events hit with ~0–1 day warning. |
| **Forecast (T2)** | Probabilistic 7‑day outlook; ~82% accuracy on naturals & market regime. |
| **AI Logistics (T4)** | Auto‑mitigation of technical/congestion events; pre‑emptive repair. |

Forecasting turns events from "gotchas" into **tradeable information** — the
bridge between the events system and the market (hedging, §6.7).

---
[← Progression & Tech Tree](08-progression-tech-tree.md) · [Next: AI Competitors →](10-ai-competitors.md)
