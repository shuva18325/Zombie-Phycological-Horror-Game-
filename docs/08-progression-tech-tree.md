# 8. Progression & Tech Tree

The player evolves **farmer → extractor → industrialist → automated tycoon**
across **four eras**. Progression is driven by **Research Points (RP)** and
gated by **era prerequisites** and **HQ level**.

## 8.1 Research Points (RP)

RP is earned passively and through play:

```
RP/day =  0.5 × (dailyNetIncome / 1000)          # profit funds research
        + 1 × (distinctResourcesSold)            # diversity bonus
        + 2 × (Research Lab buildings)           # dedicated buildings
        + eventBonuses
```

A **Research Lab** (\$2,000, T2, industrial/HQ hex) converts workers + power
into RP directly, letting a player "buy" progression speed at the cost of
production. Difficulty scales RP needs (Appendix F).

## 8.2 The Four Eras

| Era | Theme | HQ req | Gate to next | Feel |
|-----|-------|:------:|--------------|------|
| **1 — Farm** | Survive as a farmer | 1 | Research any 2 Era‑1 nodes | Cozy tutorial economy |
| **2 — Extract** | Oil, ore, timber, water at scale | 2 | Research Extraction + 1 more | First pollution & logistics stress |
| **3 — Industry** | Refine raw → high‑value goods | 3 | Research Refining + Energy | Vertical integration; markets bite |
| **4 — Automation** | Drones, AI logistics, global trade | 4 | Research AI Logistics | Endgame optimization & dominance |

## 8.3 Tech Tree (Appendix E)

Nodes, costs (RP), prerequisites, and unlocks. Times assume Standard difficulty.

### Era 1 — Farm

| Node | RP | Days | Prereq | Unlocks |
|------|:--:|:----:|--------|---------|
| **Agriculture** | 120 | 2 | — | Greenhouse; +5% crop yield |
| **Irrigation** | 160 | 2 | Agriculture | Irrigation Tower; water→farm aura |
| **Animal Husbandry** | 140 | 2 | — | Livestock L3+; +meat yield |
| **AgriTech** | 300 | 3 | Irrigation + Husbandry | Hydroponics Lab; +10% all farm output |

### Era 2 — Extract

| Node | RP | Days | Prereq | Unlocks |
|------|:--:|:----:|--------|---------|
| **Extraction** | 260 | 3 | Era‑1 ×2 | Oil Drill, Ore Mine, Quarry |
| **Forestry** | 220 | 2 | Extraction | Sawmill; replant (forest soak) |
| **Pumpjack Tech** | 380 | 3 | Extraction | Pumpjack; +oil throughput |
| **Deep Drilling** | 460 | 4 | Pumpjack | −40% depletion rate; rare‑ore chance |
| **Paved Roads** | 200 | 2 | Extraction | Paved Road tier |
| **Rail Engineering** | 520 | 4 | Paved Roads | Rail Line + Depot |

### Era 3 — Industry

| Node | RP | Days | Prereq | Unlocks |
|------|:--:|:----:|--------|---------|
| **Refining** | 560 | 4 | Extraction + Rail | Oil Refinery, Smelter |
| **Consumer Goods** | 600 | 4 | Refining | Food Processor, Furniture Works |
| **Energy** | 900 | 5 | Refining | Power Plant; powers Hydroponics/automation |
| **Pipelines** | 700 | 4 | Refining | Industrial Pipeline (fluids) |
| **Eco Upgrades** | 640 | 4 | Energy | −pollution modules; renewable line |
| **Finance** | 480 | 3 | HQ L3 | Options, short selling, equities |

### Era 4 — Automation

| Node | RP | Days | Prereq | Unlocks |
|------|:--:|:----:|--------|---------|
| **Automation** | 1,000 | 6 | Energy | Auto‑staffing; buildings need −25% workers |
| **AI Logistics** | 1,200 | 6 | Automation + Pipelines | Auto‑routing; +8% network quality; congestion pre‑empt |
| **Drone Delivery** | 1,100 | 6 | Automation | Drone lines (ignore distance penalty, cap 30) |
| **Renewable Energy** | 1,050 | 6 | Eco Upgrades | Solar/Wind: Power with ~0 pollution |
| **Global Trade** | 1,400 | 7 | AI Logistics + Finance | Export routes: +25% prices, new demand sinks |
| **Corporate HQ** | 1,600 | 8 | HQ L4 | HQ L5; +22% morale; takeover tools |

## 8.4 Tech Tree Diagram

```
ERA 1 ─────────────► ERA 2 ─────────────► ERA 3 ─────────────► ERA 4
Agriculture          Extraction           Refining             Automation
   │                    │  │  │              │  │  │              │   │   │
Irrigation           Forestry│Pumpjack     Consumer│Energy      AILogistics│Drones
   │                    │  DeepDrill          │   │  │            │       │
Husbandry            PavedRoads              Pipelines│EcoUpg    GlobalTrade RenewEnergy
   │                    │                     │   Finance          │
AgriTech             RailEngineering          │                CorporateHQ (HQ L5)
```

## 8.5 Progression Milestones (soft goals)

The game marks natural milestones that reshape play:

| Milestone | Typical timing | What changes |
|-----------|:--------------:|--------------|
| **First refinery online** | Yr 2–3 | Income shifts from raw to refined; pollution jumps. |
| **First Regional Hub** | Yr 3 | Map "shrinks"; far hexes become viable. |
| **Full pipeline backbone** | Yr 4–5 | Oil economy uncapped; trader endgame opens. |
| **Automation** | Yr 5–6 | Labor stops being the bottleneck; scale explodes. |
| **Global Trade** | Yr 6+ | New demand escapes self‑crash; run "solved" if ahead. |

## 8.6 Automation & Late‑Game Systems (requested unlocks)

| Unlock | System it adds |
|--------|----------------|
| **Automation** | Buildings self‑staff (−25% worker need); toggle auto‑upgrade rules. |
| **Rail networks** | High‑cap backbone; trunk routing across the map. |
| **Oil refineries** | Crude → Fuel value web; energy chain. |
| **Drone delivery** | Point‑to‑hub lines that **ignore distance penalty** (cap 30) — solves far‑hex logistics without hubs. |
| **Corporate HQ upgrades** | HQ L5: morale aura, 40 connections, takeover suite. |
| **Global trade routes** | External demand sinks: sell at +25% and escape domestic gluts. |
| **Renewable energy** | Power with ≈0 pollution — the eco escape from the pollution clock. |
| **AI‑driven logistics** | Network auto‑balancing; +8% average connection quality. |

## 8.7 Prestige / New Game+ (optional, see Appendix G)

On winning, the player may **incorporate globally** and start a New Game+ with a
persistent **Legacy Perk** (e.g., start with Paved Roads unlocked) and a harder
map seed pool — extending replay for mastery players.

---
[← Map Overview UI](07-ui-mockups.md) · [Next: Events System →](09-events.md)
