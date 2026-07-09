# 13. Formulas

This section is the **simulation's math spec**. It formalizes the four core
formulas from the brief and expands them into the full set the engine needs,
with every variable defined and a canonical **tick order** so the numbers are
reproducible.

> **Notation:** `clamp(x,a,b)` bounds x to [a,b]. Subscript `t` = current tick.
> Constants in `CAPS` are defined in [`docs/README.md`](README.md#-global-constants-single-source-of-truth)
> and [Appendix F](appendix-f-balancing.md).

## 13.0 Simulation Tick Order (canonical)

Each `TICK` (1 in‑game hour) the engine evaluates systems in this fixed order so
results are deterministic:

```
1.  Weather/Season modifiers refresh (per day/season boundary)
2.  Worker efficiency computed per building         (§13.4)
3.  Building production computed → into storage      (§13.1, §13.5)
4.  Connection quality & throughput computed         (§13.3)
5.  Storage drained to hubs at throughput            (flow)
6.  Pollution emitted, diffused, decayed             (§13.7)
7.  Market prices updated (supply/demand/influence)  (§13.2)
8.  Player/AI market orders settle
9.  Maintenance & wages charged (per day boundary)
10. Event director rolls & applies                    (§9)
11. Win/loss conditions checked                       (§12)
```

---

## 13.1 Resource Flow (core, expanded)

**Brief:** `Flow = BaseYield × ConnectionQuality × BuildingLevel`.

**Formalized.** Production first, then delivery (they are different things):

```
── Production (into building storage) ──
Produced_t = BaseOutput(building)                       # L1 catalog value §4.3
           × LevelMult(level)                           # §4.2 table (1.00 … 3.75)
           × YieldScalar(hex.yieldRating)               # §2.3: 0.4 + 0.12×(Y−1)
           × Efficiency                                 # §13.4  (0 … 1.3)
           × SeasonProdMult(resource, season)           # §6.5
           × (1 − PollutionYieldPenalty(hex))           # §2.4 thresholds
           × DepletionFactor(hex)                       # finite terrains, §13.8

storage += Produced_t         (capped at storageCapacity → overflow idles bldg)

── Delivery (storage → hub) ──
Delivered_t = min( storage ,  Cap(connType) × Quality )   # §13.3
storage    -= Delivered_t
hubStorage += Delivered_t × ConnValueMult(state)          # green +8%, red −10% §5.3
```

**Variable glossary**

| Symbol | Meaning | Source |
|--------|---------|--------|
| `BaseOutput` | building's L1 units/tick | §4.3 catalog |
| `LevelMult` | level multiplier | §4.2 |
| `YieldScalar` | hex richness scalar | §2.3 |
| `Efficiency` | live operating efficiency | §13.4 |
| `Cap(connType)` | line max throughput | §5.2 |
| `Quality` | connection quality 0..1 | §13.3 |
| `ConnValueMult` | freshness/value bonus by state | §5.3 |

> The brief's `ConnectionQuality × BuildingLevel` survives as
> `Quality × LevelMult`; we split **make** vs. **move** so the "backed up"
> bottleneck (produce 7.3, deliver 2.3) emerges naturally.

## 13.2 Market Price (core, expanded)

**Brief:** `Price = GlobalDemand − GlobalSupply + PlayerInfluence`.

**Formalized** as a mean‑reverting elasticity model (full derivation in §6.4):

```
Price_t = clamp(
      P_base
    × ( Demand_t / Supply_t ) ^ ε
    × SeasonMult(resource, season)
    × ( 1 + PlayerInfluence_t )
    × ( 1 + Momentum_t )
    × ( 1 + Noise_t )
  , 0.25×P_base , 4×P_base )         # circuit breakers

where
  Supply_t         = Supply_base + PlayerSold_t + Σ AISold_t + eventSupplyΔ
  Demand_t         = Demand_base + eventDemandΔ + Σ AIConsumed_t
  PlayerInfluence_t= clamp( k × (PlayerSold_t − PlayerBought_t) / MarketDepth ,
                            −0.6, +0.6 )        # k ≈ 0.15
  Momentum_t       = 0.7×Momentum_{t−1} + 0.3×(Price_{t−1}/EMA_n(Price) − 1)
  Noise_t          = clamp( Noise_{t−1}×0.6 + N(0, σ_vol) , −0.25, +0.25 )
  σ_vol            = VolatilityClass(resource) × DifficultyVolMult
```

The requested `Demand − Supply + PlayerInfluence` is preserved *in spirit and
sign*: price rises when demand exceeds supply and when the player is net‑buying;
it falls when the player floods supply (the self‑crash). We use a **ratio &
exponent** instead of a raw subtraction so prices stay positive and elasticity
is per‑resource.

## 13.3 Connection Quality & Throughput

(See [Connections §5.4](05-connections.md) for the narrative version.)

```
Quality = clamp(
      BaseQuality(connType)          # dirt .35 / paved .60 / rail .85 / pipe .95
    × DistanceFactor                 # 1 / (1 + 0.10×(pathHops − 1))
    × Health                         # 0..1
    × (1 − Congestion)               # clamp((offered−cap)/cap, 0, 0.5)
    × HubBonus                       # 1.00 … 1.10
  , 0, 1)

State      = RED   if Quality ≤ 0.45
             YELLOW if 0.45 < Quality ≤ 0.75
             GREEN  if Quality > 0.75

Throughput = min( offeredFlow , Cap(connType) × Quality )

Health_t   = clamp( Health_{t−1}
                    − 0.002×UtilizationRatio − WeatherWear + MaintenanceRestore ,
                    0, 1 )
UtilizationRatio = offeredFlow / Cap(connType)
```

## 13.4 Worker Efficiency (core, expanded)

**Brief:** `Efficiency = Morale × TravelSpeed × HQLevel`.

**Formalized** into a building‑level efficiency plus its worker inputs:

```
Efficiency = clamp(
      Staffing
    × Morale
    × TravelFactor
    × HQFactor
    × PollutionFactor
    × ConnectionFactor
  , 0, 1.30 )

── components ──
Staffing        = clamp( assignedWorkers / requiredWorkers , 0, 1.3 )   # over-staff to +30% w/ tech
Morale          = clamp( 0.5
                        + 0.3×WageRatio              # wage / prevailingWage
                        + 0.1×HousingQuality
                        + 0.1×HQ.moraleAura          # §4.6
                        − 0.2×PollutionExposure
                        − StrikePenalty , 0, 1.2 )
TravelFactor    = TravelSpeed(connType) × DistanceFactor        # §5.6
HQFactor        = 0.90 + 0.05×(HQlevel − 1)                     # 0.90 … 1.10
PollutionFactor = 1 − PollutionMoralePenalty(localPollution)   # §2.4
ConnectionFactor= 0.70 (RED) | 0.85 (YELLOW) | 1.00 (GREEN)    # §5.3
```

The brief's three drivers (`Morale`, `TravelSpeed`, `HQLevel`) are the load‑
bearing terms; we add `Staffing`, pollution, and connection so the four core
systems (workers, hexes, pollution, connections) all couple into one number.

## 13.5 Building Efficiency Summary

For quick reference, a building's realized output is:

```
RealizedOutput = BaseOutput × LevelMult × YieldScalar × Efficiency
               × SeasonProdMult × (1 − PollutionYieldPenalty) × DepletionFactor
```
and only `min(storage, Cap×Quality)` of it actually reaches the hub each tick.

## 13.6 Breakdown Probability

```
P(breakdown)_t =  BASE_BREAK (0.002)
               × (1 + 2×(1 − Health))          # frayed lines/buildings fail more
               × (1 + DeferredMaintDays×0.15)   # skipped upkeep
               × WeatherStress                  # storms/floods raise it
               × DifficultyBreakMult
```
Restored by maintenance/repair; auto‑maintenance keeps `Health ≥ 0.8` so
`P(breakdown)` stays near `BASE_BREAK`.

## 13.7 Pollution (core, expanded)

**Brief:** `Pollution = BuildingLevel × Output − EcoUpgrades`.

**Formalized** as per‑hex accumulation with diffusion (see [Events §9.4](09-events.md#94-pollution-as-an-event-driver-diffusion)):

```
Emission(building) = BasePollution × LevelMult × (Output/BaseOutput)
                   − EcoModule(building)        # Eco/Renewable tech subtracts here

localPollution_t = clamp(
      localPollution_{t−1}
    + Σ_buildings Emission
    + DIFFUSION (0.15) × Σ_neighbors (neighborPoll − localPoll)
    − ecoDecay(terrain, EcoUpgradesLevel)
  , 0, 100 )

globalPollution_t = Σ_hexes localPollution_t / POLL_SCALE
```
The brief's `BuildingLevel × Output − EcoUpgrades` is exactly the
`BasePollution×LevelMult×(Output/BaseOutput) − EcoModule` term; diffusion and
decay make it a spatial system rather than a per‑building scalar.

## 13.8 Depletion (finite terrains)

```
reserve_t   = reserve_{t−1} − Extracted_t
DepletionFactor = clamp( reserve_t / (0.4 × reserve_0) , 0.2, 1.0 )
```
Output stays at 100% until reserves fall below 40%, then tapers to a 20% floor
("hard to get the last drops"). **Deep Drilling** tech multiplies `reserve_0`
effectively by slowing drain. Oil/Mineral hexes can be **exhausted** (become
low‑value industrial‑capable land), pushing the player to keep expanding.

## 13.9 Net Worth & Economy Aggregates

```
NetWorth = Cash
         + Σ_hexes  HexValue(hex)                      # §2.9 pricing, +improvements
         + Σ_bldgs  0.6 × cumulativeBuildCost          # depreciated asset value
         + Σ_inv    inventoryUnits × marketPrice        # marked to market
         + Σ_equity shares × sharePrice
         − Loans − MarginOwed

DailyNetIncome = Σ sales − Σ(wages + maintenance + interest + fees + taxes)
Runway(days)   = Cash / max(1, −DailyNetIncome)         # if losing money
```

## 13.10 Research Points

```
RP/day = 0.5×(DailyNetIncome/1000)
       + 1×(distinctResourcesSoldToday)
       + 2×(ResearchLabCount)
       + eventRP
       , floored at 0        # you don't lose research when unprofitable
ResearchProgress += RP; node completes when progress ≥ node.cost (§8.3)
```

## 13.11 Worked End‑to‑End Example (one tick)

> Oil Drill L2 on hex #23 (`yieldRating 8`), 3 hops on **rail** to HQ (health 1),
> 4/6 workers, morale 0.9, local pollution 58, Summer.

```
LevelMult(L2)        = 1.45
YieldScalar(8)       = 0.4 + 0.12×7 = 1.24
Staffing             = 4/6 = 0.667
Morale               = 0.9
TravelFactor         = 0.95(rail) × [1/(1+0.10×2)=0.833] = 0.791
HQFactor (HQ L2)     = 0.95
PollutionFactor(58)  ≈ 1 − 0.15 = 0.85   (41–60 band)
ConnectionFactor     = YELLOW → 0.85   (Quality 0.71 from §5.9)
Efficiency = clamp(0.667×0.9×0.791×0.95×0.85×0.85 ,0,1.3) = 0.326

BaseOutput(OilDrill)=5 ; SeasonProdMult(oil,summer)=1.0
PollutionYieldPenalty(58)=0.15 ; DepletionFactor (reserve 71%)=1.0
Produced = 5 × 1.45 × 1.24 × 0.326 × 1.0 × (1−0.15) × 1.0 ≈ 2.49 crude/tick

Delivery: Cap(rail)=40, Quality 0.71 → 40×0.71=28.4 ≫ storage → all delivered
hubStorage += 2.49 × 1.00 (yellow, no bonus/penalty)
```
Interpretation: the **line is fine** now (rail), so the bottleneck has moved to
**staffing & pollution** — telling the player to hire 2 workers and clean the
hex, not to touch the connection. This is exactly the kind of shifting‑bottleneck
decision the formulas are designed to produce.

## 13.12 Formula Index

| # | Formula | Section |
|---|---------|---------|
| Resource Flow (produce/deliver) | §13.1 |
| Market Price | §13.2 |
| Connection Quality / Throughput / Health | §13.3 |
| Worker Efficiency & Morale | §13.4 |
| Building Realized Output | §13.5 |
| Breakdown Probability | §13.6 |
| Pollution (emit/diffuse/decay) | §13.7 |
| Depletion | §13.8 |
| Net Worth / Income / Runway | §13.9 |
| Research Points | §13.10 |

---
[← Win & Loss](12-win-loss.md) · [Next: Appendix A — Resources →](appendix-a-resources.md)
