# 4. Buildings & Extraction

Buildings sit in a hex's **build slots** and convert a hex's raw yield (plus
inputs and workers) into resources or refined goods. Every building shares the
same stat block; the numbers differ by type and **level (1–5)**.

## 4.1 Universal Building Stat Block

Every building instance carries:

| Field | Range | Meaning |
|-------|-------|---------|
| **Level** | 1–5 | Upgrades multiply output/storage, raise worker need & maintenance. |
| **Efficiency %** | 0–130% | Live operating efficiency (workers, morale, pollution, connection). |
| **Worker requirement** | 1–20 | Workers needed for 100% staffing at this level. |
| **Maintenance cost** | \$/day | Ongoing upkeep; scales with level. |
| **Pollution output** | pts/tick | Local pollution emitted (some buildings negative = soak). |
| **Storage capacity** | units | Buffer that fills if outbound flow < production. |
| **Input(s)** | resource@rate | Some buildings consume inputs (refineries, sawmill, hydroponics). |
| **Output(s)** | resource@rate | Base production before multipliers. |

**Efficiency** is computed live (see [Formulas §13.4](13-formulas.md)):
```
Efficiency = clamp( Staffing × Morale × PollutionFactor × ConnectionFactor , 0, 1.3 )
```
A building at <100% staffing produces proportionally less; over‑staffing (up to
+30%) is possible with tech.

## 4.2 Level Scaling (applies to all buildings)

| Level | Output ×  | Storage × | Worker req × | Maintenance × | Upgrade cost (× base build) |
|:-----:|:---------:|:---------:|:------------:|:-------------:|:---------------------------:|
| 1 | 1.00 | 1.00 | 1.00 | 1.00 | — (initial build) |
| 2 | 1.45 | 1.40 | 1.30 | 1.35 | 1.6× |
| 3 | 2.05 | 1.90 | 1.65 | 1.80 | 2.4× |
| 4 | 2.80 | 2.50 | 2.10 | 2.40 | 3.6× |
| 5 | 3.75 | 3.30 | 2.60 | 3.20 | 5.4× |

> **Design read:** output scales *faster* than worker requirement, so leveling is
> efficient — but maintenance and pollution scale too, so a maxed building on a
> poorly connected hex is a money pit. Upgrade the **line** before the building.

## 4.3 Building Catalog

Base stats are **Level 1**. `Out` = units/tick at 100% efficiency on a
`yieldRating 5` hex. Multiply by the hex's `YieldScalar` (§2.3) in practice.

### 🌾 Farms

| Building | Build cost | Out (L1) | Worker req | Maint/day | Pollution/tick | Storage | Input | Tech gate |
|----------|:----------:|:--------:|:----------:|:---------:|:--------------:|:-------:|-------|-----------|
| **Crop Farm** | \$300 | 6 Crops | 3 | \$8 | −0.5 (soak) | 120 | — | Start |
| **Livestock Farm** | \$450 | 4 Meat | 4 | \$12 | +0.5 | 90 | 2 Crops | Start |
| **Greenhouse** | \$900 | 9 Crops | 3 | \$16 | −0.2 | 150 | 1 Water | T1 Agriculture |
| **Hydroponics Lab** | \$1,800 | 14 Crops | 5 | \$28 | 0 | 200 | 3 Water + Power | T2 AgriTech |

### 🛢️ Oil & Minerals

| Building | Build cost | Out (L1) | Worker req | Maint/day | Pollution/tick | Storage | Input | Tech gate |
|----------|:----------:|:--------:|:----------:|:---------:|:--------------:|:-------:|-------|-----------|
| **Oil Drill** | \$1,200 | 5 Crude | 4 | \$22 | +3.0 | 100 | — | T1 Extraction |
| **Pumpjack** | \$2,400 | 9 Crude | 3 | \$30 | +2.2 | 140 | — | T2 Extraction |
| **Ore Mine** | \$1,000 | 6 Ore | 5 | \$20 | +2.5 | 110 | — | T1 Extraction |
| **Quarry** | \$700 | 8 Stone | 4 | \$14 | +1.5 | 130 | — | T1 Extraction |

### 🌲 Forestry

| Building | Build cost | Out (L1) | Worker req | Maint/day | Pollution/tick | Storage | Input | Tech gate |
|----------|:----------:|:--------:|:----------:|:---------:|:--------------:|:-------:|-------|-----------|
| **Logging Camp** | \$500 | 7 Timber | 4 | \$12 | +1.0 (−1.5 if replant) | 120 | — | Start |
| **Sawmill** | \$1,100 | 5 Lumber | 5 | \$18 | +0.8 | 160 | 2 Timber | T1 Forestry |

### 💧 Water

| Building | Build cost | Out (L1) | Worker req | Maint/day | Pollution/tick | Storage | Input | Tech gate |
|----------|:----------:|:--------:|:----------:|:---------:|:--------------:|:-------:|-------|-----------|
| **Pump Station** | \$600 | 8 Water | 2 | \$10 | 0 | 140 | — | Start |
| **Irrigation Tower** | \$1,400 | — (buff) | 3 | \$16 | 0 | — | 4 Water | T1 Agriculture |

> **Irrigation Tower** produces no sellable resource. Instead it applies a
> **+20% crop yield** aura to farmland hexes within its irrigation radius
> (radius 1, or 2 with the **Reservoir** spec / T2 tech). It is a force
> multiplier, not an extractor.

### 🏭 Industrial (Value‑Add) — unlocked via tech

| Building | Build cost | Out (L1) | Worker req | Maint/day | Pollution/tick | Storage | Input | Tech gate |
|----------|:----------:|:--------:|:----------:|:---------:|:--------------:|:-------:|-------|-----------|
| **Oil Refinery** | \$3,500 | 6 Fuel | 8 | \$45 | +4.0 | 180 | 8 Crude | T3 Refining |
| **Smelter** | \$3,200 | 5 Metal | 8 | \$42 | +3.5 | 170 | 8 Ore | T3 Refining |
| **Food Processor** | \$2,600 | 7 Goods | 6 | \$30 | +1.2 | 200 | 6 Crops + 3 Meat | T3 Consumer |
| **Furniture Works** | \$2,800 | 6 Goods | 6 | \$28 | +1.0 | 190 | 6 Lumber | T3 Consumer |
| **Power Plant** | \$3,000 | 20 Power | 5 | \$50 | +5.0 (−ε renewable) | — | 6 Fuel *or* renewable | T3 Energy |

Refined goods (Fuel, Metal, Goods) sell for **2–4×** the value of their raw
inputs, so the mid‑game shifts from extraction to **vertical integration**:
own the oil field *and* the refinery *and* the pipeline between them.

## 4.4 Production Chains (Value Web)

```
Crops ─┬─▶ Livestock ─▶ Meat ─┐
       └────────────────────▶ Food Processor ─▶ Goods ($$$)
Water ─▶ Greenhouse/Hydroponics ─▶ Crops (more)
Timber ─▶ Sawmill ─▶ Lumber ─▶ Furniture Works ─▶ Goods ($$$)
Crude ─▶ Oil Refinery ─▶ Fuel ─┬─▶ Power Plant ─▶ Power
                                └─▶ (sell / futures)
Ore ─▶ Smelter ─▶ Metal ($$$)
Stone ─▶ (construction discount: −% on connection & terraform costs)
Power ─▶ enables Hydroponics, Automation, Drone Delivery
```

Design intent: **raw resources are the tutorial; refined goods are the game.**
Stone and Power are "enabler" resources — rarely the main income, but they
discount infrastructure and unlock the highest tiers.

## 4.5 Storage & Overflow

- Each building has a **storage buffer**. Production adds to it; the connection
  **drains** it toward the hub at the throughput rate (§5).
- If a building's storage **fills** (production > throughput), it **stops
  producing** (idles) and a ⚠️ *"Backed up"* icon appears — the classic signal
  that the hex needs a better line, not a better building.
- **HQ / Hub storage** is the sellable pool. Selling on the market draws from
  hub storage. Hub storage cap scales with HQ level (§4.6).

## 4.6 HQ & Hubs

The **HQ** is the master hub and command center. Later, **Regional Hubs** can be
built to shorten connection distances on a large map.

| HQ Level | Cost | Hub storage | Worker morale aura | Max connections | Unlocks |
|:--------:|:----:|:-----------:|:------------------:|:---------------:|---------|
| 1 (start)| — | 400 | +0% | 6 | Basic trading |
| 2 | \$2,000 | 800 | +5% | 10 | Futures market |
| 3 | \$5,000 | 1,600 | +10% | 16 | Equity investing, 1 Regional Hub |
| 4 | \$12,000 | 3,200 | +15% | 24 | AI logistics, 2 Regional Hubs |
| 5 (Corporate)| \$30,000 | 6,400 | +22% | 40 | Global trade routes, drone network |

**Regional Hub** (\$4,000): a secondary aggregation point. Hexes route to their
*nearest* hub (player‑assignable), reducing effective connection distance and
raising quality on far‑flung hexes (see §5.4). Essential once the empire spans
20+ hexes.

## 4.7 Maintenance, Breakdowns & Repair

- **Maintenance** is paid daily from cash; unpaid maintenance (negative cash)
  drops building efficiency 3%/day until paid ("deferred maintenance").
- **Breakdowns** (event, §9): a building can fail, dropping to 0% output until
  repaired. Repair cost `= 0.4 × build cost`, time 1–2 days. Breakdown
  probability rises with connection `health` decay and skipped maintenance
  (see [Formulas §13.6](13-formulas.md)).

---
[← Player Start](03-player-start.md) · [Next: Connection Lines →](05-connections.md)
