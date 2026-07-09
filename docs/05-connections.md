# 5. Connection Lines (Core Mechanic)

> **This is the heart of HexWorld Tycoon.** Extraction is easy; *moving goods is
> the game.* Every producing hex must be connected to the HQ or a Regional Hub,
> and the **quality of that connection gates everything** downstream.

## 5.1 The Rule

- Every hex routes its output to exactly **one hub** (HQ or Regional Hub).
- A hex with **no path to a hub produces nothing sellable** — its storage fills
  and it idles.
- Connections are laid **hex‑to‑hex** along the adjacency graph (§2.8). A hex's
  effective connection to its hub is the **weakest link along the path**
  (a chain is only as strong as its worst segment).

## 5.2 Connection Types (the physical line)

| Type | Icon | Build cost/segment | Max throughput | Base quality | Speed | Breakdown risk | Best for |
|------|:----:|:------------------:|:--------------:|:------------:|:-----:|:--------------:|----------|
| **Dirt Road** | ┄┄ | \$150 | 8 units/tick | 0.35 | Slow | High | Bootstrapping, low‑yield farmland |
| **Paved Road** | ── | \$450 | 18 units/tick | 0.60 | Medium | Medium | Backbone routes, mid‑yield hexes |
| **Rail Line** | ═══ | \$1,100 | 40 units/tick | 0.85 | Fast | Low | High‑volume ore/timber, long hauls |
| **Industrial Pipeline** | ▰▰▰ | \$1,600 | 60 units/tick | 0.95 | Instant | Very Low | Crude/Fuel/Water only (fluids) |

**Notes**
- **Pipelines** carry only *fluids* (Crude, Fuel, Water) but at the highest
  throughput and lowest risk — the endgame oil logistics backbone.
- Rail requires a **Rail Depot** at each hub it serves (\$800, once per hub).
- Costs above are **per segment** (per hex‑to‑hex hop). A 4‑hex haul on rail =
  4 × \$1,100 + depot.

## 5.3 Connection Quality → State (RED / YELLOW / GREEN)

Quality is a continuous `0..1` value; the **color state** is a readable band:

| State | Color | Quality band | Throughput realized | Market value mult | Efficiency contribution | Feel |
|-------|:-----:|:------------:|:-------------------:|:-----------------:|:-----------------------:|------|
| **RED** | 🟥 | 0.00–0.45 | ≤ 45% of cap | ×0.90 (spoilage/late) | ConnectionFactor 0.70 | "Strangled" |
| **YELLOW** | 🟨 | 0.46–0.75 | 46–75% of cap | ×1.00 | ConnectionFactor 0.85 | "Okay" |
| **GREEN** | 🟩 | 0.76–1.00 | 76–100% of cap | ×1.08 (fresh/fast) | ConnectionFactor 1.00 | "Flowing" |

> The player thinks in **colors**; the sim thinks in **quality**. The whole map
> can be read at a glance by hue (see [UI §7](07-ui-mockups.md)).

## 5.4 Quality Formula

Connection quality for a hex is a function of the **line tier**, the **distance
to its hub**, the line's **health**, and any **congestion**:

```
Quality =  BaseQuality(type)
         × DistanceFactor
         × Health
         × (1 − Congestion)
         × HubBonus

DistanceFactor = 1 / (1 + 0.10 × (pathHops − 1))     # each extra hop −~9%
Health         = 0..1  (decays with use & weather; restored by maintenance)
Congestion     = clamp( (offeredFlow − cap) / cap , 0, 0.5 )   # overload penalty
HubBonus       = 1.00 (HQ) ... up to 1.10 near an upgraded Regional Hub
```

Then `state = band(Quality)` per the table in §5.3, and realized throughput:

```
Throughput = min( offeredFlow , cap(type) × Quality )
```

**Key consequences**
1. **Distance matters** — a great rail line 8 hops from HQ still degrades. This
   is *why* Regional Hubs (§4.6) exist: shorten the path.
2. **Overloading a line** (offering more than cap) adds congestion, *lowering*
   quality — so a green line can turn yellow if you over‑build the hex feeding
   it. Balance building level to line capacity.
3. **Health decay** slowly pushes lines toward red unless maintained.

## 5.5 Connection Health, Decay & Breakdowns

- Health starts at `1.0` and **decays** with throughput volume and harsh weather:
  `health −= 0.002 × utilizationRatio + weatherWear` per tick.
- **Maintenance / repair:** spend to restore health. Auto‑maintenance can be
  toggled per line (costs \$/day, keeps health ≥ 0.8).
- **Breakdown event:** if `health < 0.3`, a segment can break (drops to RED /
  0 throughput) until repaired. Repair `= 0.25 × segment build cost`.
- **Weather interaction:** Floods wash out dirt roads (health −0.4 instantly);
  rail and pipeline are far more resilient (see [Events §9](09-events.md)).

## 5.6 Worker Travel Time

Workers "commute" from the HQ/hub to their assigned hex along the connection.
Line speed sets travel time, which feeds **Worker Efficiency**:

```
TravelSpeed(type):  dirt 0.6 | paved 0.8 | rail 0.95 | pipeline n/a(1.0)
TravelFactor       = TravelSpeed × DistanceFactor      # 0..1
```

So a distant hex on a dirt road suffers **twice**: low resource throughput
*and* low worker efficiency (longer commute). Upgrading the line fixes both.
(See [Worker Efficiency, §13.4](13-formulas.md).)

## 5.7 Routing & Load Balancing (advanced)

Once the empire grows, the player manages a small **logistics graph**:

- **Reassign hub:** point a hex at a nearer Regional Hub to cut distance.
- **Trunk lines:** a shared paved/rail segment can carry flow from multiple
  hexes — but its cap is shared, so trunks congest. The UI shows per‑segment
  load as a fill bar.
- **Parallel lines:** lay a second line on a congested route to double cap
  (expensive; endgame optimization).
- **AI Logistics tech (T4):** auto‑balances routing and pre‑empts congestion,
  effectively raising average quality by ~8% network‑wide.

## 5.8 Connection Upgrade Path

```
Dirt ─$450→ Paved ─$1,100→ Rail ─$1,600→ Pipeline (fluids)
  │            │             │
  └── health/maintenance applies at every tier ──┘
```

Upgrading a segment **replaces** the line (pay the difference toward the new
tier's per‑segment cost). Downgrading is not allowed (demolish to remove).

## 5.9 Worked Example

> A `yieldRating 8` Oil Field, 3 hops from HQ, with an Oil Drill L2 (produces
> ~7.3 crude/tick after YieldScalar), connected by **dirt road**:

```
cap(dirt) = 8 ; BaseQuality = 0.35
DistanceFactor = 1 / (1 + 0.10 × 2) = 0.833
Health = 1.0 ; Congestion: offered 7.3 < cap 8 → 0
Quality = 0.35 × 0.833 × 1.0 × 1.0 = 0.29  → RED 🟥
Throughput = min(7.3, 8 × 0.29) = min(7.3, 2.3) = 2.3 crude/tick
```
**The drill makes 7.3 but only 2.3 reaches the hub — 68% wasted.** Upgrade to
**Rail**:
```
cap(rail)=40 ; BaseQuality=0.85
Quality = 0.85 × 0.833 = 0.71 → YELLOW 🟨
Throughput = min(7.3, 40 × 0.71) = 7.3 crude/tick   ✅ full output flows
```
Add a **Regional Hub** one hop away (path 1 hop, HubBonus 1.08):
```
Quality = 0.85 × 1.0 × 1.08 = 0.92 → GREEN 🟩   → +8% market value on top.
```
This single example is the game's central lesson, and the tutorial (§3.3, beat 5)
walks the player through exactly it in miniature.

---
[← Buildings & Extraction](04-buildings-extraction.md) · [Next: Economy & Stock Market →](06-economy-stock-market.md)
