# 2. Hex Map System

The map is the game's board: **exactly 60 hexagons** arranged in a rough
disc/blob. Every hex is a small economy with its own terrain, yields, capacity,
and infrastructure state.

## 2.1 Hex Data Model

Each hex is a record:

```jsonc
Hex {
  id:              int,          // 0..59
  axial:           { q, r },     // axial hex coordinate
  terrain:         TerrainType,  // enum, see 2.2
  yieldRating:     int,          // 1..10  (raw richness)
  pollutionLevel:  float,        // 0..100 (local accumulated pollution)
  workerCapacity:  int,          // max workers assignable on this hex
  buildSlots:      int,          // 1..4   (how many buildings fit)
  buildings:       [Building],   // occupied slots
  owner:           OwnerId,      // player | AI corp | neutral (unclaimed)
  connection:      {
     hub:          HexId | null, // which hub this hex routes to
     type:         ConnType,     // dirt | paved | rail | pipeline | none
     quality:      float,        // 0..1  computed (see §5)
     state:        Color,        // RED | YELLOW | GREEN (derived from quality)
     health:       float,        // 0..1  (breakdown risk driver)
  },
  terraformLevel:  int,          // 0..3  (yield/capacity boosts)
  specialization:  Spec | null,  // optional focus bonus (see 2.6)
  adjacency:       [HexId],      // up to 6 neighbors
}
```

## 2.2 Terrain Types

Six base terrains. Each biases which buildings are viable and what the hex is
*good at*. `Yield band` is the range the generator rolls within.

| Terrain | Icon | Primary output | Yield band | Base pollution soak | Typical build slots | Notes |
|---------|:----:|----------------|:----------:|:-------------------:|:-------------------:|-------|
| **Farmland** | 🌾 | Crops, livestock | 3–8 | High (absorbs) | 2–4 | Fertility varies by moisture. Core early economy. |
| **Forest** | 🌲 | Timber, water | 4–9 | Very High (absorbs) | 1–3 | Clear‑cutting drops yield & soak permanently unless replanted. |
| **Oil Field** | 🛢️ | Crude oil | 5–10 | Very Low (emits) | 1–2 | Finite by default (depletion on); high value, high pollution. |
| **Mineral Deposit** | ⛏️ | Ore, stone | 4–10 | Very Low (emits) | 1–3 | Ore vs. stone sub‑roll. Finite. |
| **Water** | 💧 | Fresh water, hydro | 5–9 | N/A | 1–2 | Enables irrigation & hydroponics on neighbors; cannot host heavy industry. |
| **Industrial Zone** | 🏭 | Refined goods | 2–5 (raw) | Very Low (emits) | 3–4 | Poor raw yield, but hosts refineries/factories that add value to inputs. |

**Terrain distribution target (of 60 hexes):**

| Terrain | Count | % |
|---------|:-----:|:--:|
| Farmland | 18 | 30% |
| Forest | 10 | 17% |
| Oil Field | 6 | 10% |
| Mineral Deposit | 8 | 13% |
| Water | 8 | 13% |
| Industrial Zone | 10 | 17% |
| **Total** | **60** | **100%** |

> These are **targets**, not hard rules — the generator (§2.7) enforces them
> within ±1 to guarantee a viable but varied map.

## 2.3 Yield Rating (1–10)

The **raw richness** of a hex before any building, worker, or connection
multipliers. Interpreted as a scalar on base output:

```
YieldScalar = 0.4 + 0.12 × (yieldRating − 1)      // maps 1→0.4 ... 10→1.48
```

So a `yieldRating 10` hex produces ~3.7× a `yieldRating 1` hex from the same
building, all else equal. Yield can be raised by **terraforming** (+1 to +3
effective) and lowered by **depletion** (finite terrains) and **pollution**.

## 2.4 Pollution Level (per‑hex)

- Range **0–100**. Rises from on‑hex emitting buildings and **bleeds to
  neighbors** each tick (diffusion, §9 / §13).
- Effects at thresholds:

| Local pollution | Effect |
|:---------------:|--------|
| 0–20 | None ("clean"). |
| 21–40 | −5% yield, worker morale −2%. |
| 41–60 | −15% yield, morale −6%, minor health events possible. |
| 61–80 | −30% yield, morale −15%, farmland fertility decays. |
| 81–100 | −50% yield, morale −30%, "dead zone" risk; contributes heavily to global disaster meter. |

Farmland and Forest **absorb** pollution (negative net emission when unbuilt or
lightly built), acting as natural sinks. This makes "green buffer" tiles a real
strategic asset.

## 2.5 Worker Capacity & Build Slots

- **Worker capacity** scales with terrain and terraform level:
  `workerCapacity = base(terrain) + 3 × terraformLevel`.
  Base ranges: Farmland 8–12, Forest 4–8, Oil 3–6, Mineral 4–8, Water 2–4,
  Industrial 10–16.
- **Build slots (1–4)** cap how many buildings a hex hosts. A slot holds one
  building of any compatible type. Slots can be **cleared** (demolish, 50%
  refund) or **expanded** via terraform (+1 slot at terraform L2, max 4).

## 2.6 Hex Operations: Upgrade, Terraform, Specialize

| Operation | Effect | Cost model | Time |
|-----------|--------|-----------|------|
| **Terraform L1→L3** | +1 yield eff., +3 worker cap, +1 slot (at L2), reduces harshness | `1500 × 2.2^(L−1)` | 3–9 days |
| **Specialize** | Locks a hex focus for a strong bonus (see below) | `2500` flat, refundable at 40% | 2 days |
| **Reclaim (eco)** | Replant forest / detoxify soil; lowers pollution, restores soak | `800 + 40×pollution` | 5 days |
| **Depletion mgmt** | Slows finite‑resource drain (oil/mineral) | Passive tech (§8) | — |

**Specialization options** (one per hex, terrain‑gated):

| Spec | Requires terrain | Bonus | Trade‑off |
|------|------------------|-------|-----------|
| **Breadbasket** | Farmland | +25% crop yield, +10% worker cap | −50% to non‑crop outputs |
| **Old‑Growth** | Forest | +30% timber, +passive pollution soak | Cannot clear‑cut (locked) |
| **Gusher** | Oil Field | +35% oil flow | +40% pollution, faster depletion |
| **Motherlode** | Mineral | +30% ore, unlocks rare‑ore chance | +25% maintenance |
| **Reservoir** | Water | Doubles irrigation radius | Cannot host hydro plant |
| **Foundry Park** | Industrial | +20% refining efficiency, +1 slot | +30% pollution |

## 2.7 Hex Map Generation Logic  <a id="hex-map-generation-logic"></a>

> **Appendix D.** Deterministic, seed‑driven generation that guarantees a
> *playable but varied* 60‑hex map. Runs once at new‑game.

### Design goals of the generator
1. Always **60 hexes**, roughly disc‑shaped, fully connected adjacency graph.
2. Terrain counts hit §2.2 targets **±1**.
3. The **player start hex** is always a modest farmland (yieldRating 3–4) with
   at least one high‑value terrain within 2 rings.
4. Resource "clusters" feel natural (oil fields group, water forms a river‑ish
   chain) rather than being uniform noise.
5. No isolated pockets; every hex is reachable.

### Pseudocode

```pseudo
function generateMap(seed):
    rng = SeededRNG(seed)

    # --- 1. Lay out 60 hexes in a spiral disc ---
    coords = spiralAxial(count = 60)          # ring 0 center, then rings out
    hexes  = [ Hex(id=i, axial=coords[i]) for i in 0..59 ]
    buildAdjacency(hexes)                       # up to 6 neighbors each

    # --- 2. Seed terrain via weighted Voronoi-ish growth ---
    # Plant terrain "seeds", then flood-grow to make clusters.
    quotas = { Farmland:18, Forest:10, Oil:6, Mineral:8, Water:8, Industrial:10 }
    seeds  = pickSeedHexes(hexes, rng, perTerrain = { Water:2, Oil:2, Mineral:2,
                                                      Forest:2, Industrial:2,
                                                      Farmland:3 })
    assignSeeds(seeds)                          # each seed gets its terrain
    floodGrow(hexes, quotas, rng, cohesion=0.7) # grow clusters until quotas met
    enforceQuotas(hexes, quotas, tolerance=1)   # swap outliers to hit ±1

    # --- 3. Rivers & water chains ---
    connectWaterHexes(hexes, rng)               # bias Water into 1-2 chains
    tagIrrigable(hexes)                          # farmland adjacent to water = fertile+

    # --- 4. Roll per-hex attributes ---
    for h in hexes:
        h.yieldRating    = rollYield(h.terrain, rng, fertilityBias(h))
        h.buildSlots     = rollSlots(h.terrain, rng)          # within terrain band
        h.workerCapacity = baseCap(h.terrain, rng)
        h.pollutionLevel = 0
        h.terraformLevel = 0
        h.connection     = { type:none, quality:0, state:RED, health:1.0 }
        if h.terrain in [Oil, Mineral]:
            h.reserve = rollReserve(h.yieldRating, rng)       # finite stock

    # --- 5. Choose player start ---
    start = chooseStart(hexes, rng,
             require = terrain==Farmland and yieldRating in [3,4]
                    and hasWithinRings(2, terrainIn=[Oil,Mineral,Water], count>=1))
    start.owner = PLAYER
    start.buildings = [ HQ(level=1) ]
    start.connection = { type:dirt, quality:0.35, state:RED, health:1.0, hub:start.id }

    # --- 6. Place AI corporations & neutral hexes ---
    placeAICorps(hexes, rng, count = 3..4, minDistFromPlayer = 3 rings)
    remaining -> owner = NEUTRAL (claimable)

    # --- 7. Balance pass ---
    validate(hexes):
        assert graphConnected(hexes)
        assert totalYield within [ 300, 360 ]   # global richness sanity band
        assert playerStartViable(start)
        if any assertion fails -> reroll step(2..6) with rng.next()

    return Map(hexes, seed)
```

### Attribute roll tables (used by `rollYield` / `rollSlots`)

| Terrain | Yield roll | Slots roll | Worker‑cap roll |
|---------|-----------|-----------|-----------------|
| Farmland | `3 + rng(0..5)`, `+1` if irrigable | `2 + wrng([0,0,1,1,2])` | `8 + rng(0..4)` |
| Forest | `4 + rng(0..5)` | `1 + wrng([0,1,1,2])` | `4 + rng(0..4)` |
| Oil Field | `5 + rng(0..5)` | `1 + wrng([0,0,1])` | `3 + rng(0..3)` |
| Mineral | `4 + rng(0..6)` | `1 + wrng([0,1,1,2])` | `4 + rng(0..4)` |
| Water | `5 + rng(0..4)` | `1 + wrng([0,0,1])` | `2 + rng(0..2)` |
| Industrial | `2 + rng(0..3)` | `3 + wrng([0,0,1])` | `10 + rng(0..6)` |

`wrng([...])` = weighted random pick from the list (uniform over listed entries;
repeated values increase weight).

### Seed reproducibility
The full map is a **pure function of `seed`**. The seed is shown on the map
screen and can be shared ("try seed `HEXW‑4417`"). Daily‑challenge mode fixes
the seed for all players.

## 2.8 Adjacency & Coordinates

Hexes use **axial coordinates** `(q, r)`. The six neighbor directions:

```
        (+1,-1)   ( 0,-1)
             \     /
   (-1, 0) — (q,r) — (+1, 0)
             /     \
        (-1,+1)   ( 0,+1)
```

Adjacency drives: pollution diffusion, irrigation radius, connection routing
(you can only lay a line between adjacent or line‑of‑sight hexes), and
specialization synergies.

## 2.9 Ownership States

| State | Meaning | Player action |
|-------|---------|---------------|
| **Player** | You own it | Build, connect, upgrade, sell. |
| **AI corp** | Rival owns it | Target for takeover / market pressure. |
| **Neutral** | Unclaimed | **Acquire** via cash bid (§ economy) or auction. |
| **Protected** | Reserve/park (rare) | Cannot be claimed; passive pollution soak. |

Acquisition cost of a neutral hex:
`price = 400 + 90 × yieldRating + 250 × buildSlots + terrainPremium(terrain)`
(oil/mineral carry the highest `terrainPremium`). Contested hexes go to
**sealed‑bid auction** if an AI also wants them (§10).

---
[← Overview](01-overview.md) · [Next: Player Start →](03-player-start.md)
