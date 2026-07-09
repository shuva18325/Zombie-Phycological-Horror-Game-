# 3. Player Start

## 3.1 Starting Loadout

The player begins in the humblest possible position — the "one poor farmer"
fantasy — with just enough to survive the first few days.

| Asset | Starting value | Notes |
|-------|----------------|-------|
| **Hexes owned** | 1 | Low‑yield farmland (`yieldRating 3–4`, guaranteed by generator §2.7). |
| **HQ** | 1 × Basic HQ (Level 1) | Placed on the start hex; acts as the first & only hub. |
| **Workers** | 5 | Unassigned pool; assign to buildings for output. |
| **Connection** | 1 × Dirt road (RED) | Connects the start hex to itself/HQ; quality ≈ 0.35. |
| **Money** | \$500 | (Cozy \$1,500 / Tycoon \$300 / Ironman \$300). |
| **Tools** | Basic farming tools | Enables Crop Farm & Livestock Farm only. |
| **Tech** | Tier‑0 (nothing unlocked) | Tech tree starts fully locked except farming basics. |

## 3.2 The Start Hex (guaranteed properties)

- Terrain: **Farmland**
- Yield rating: **3–4** (deliberately mediocre — room to grow)
- Build slots: **2–4** (at least 2, so the player can build + expand)
- At least **one high‑value terrain** (Oil / Mineral / Water) within **2 rings**,
  giving the player an obvious first expansion target.
- Starts with **1 empty build slot** beside the HQ for the first farm.

## 3.3 First 10 Minutes (Onboarding Script)

The tutorial is **diegetic** (in‑world prompts from an "Old Farmhand" mentor),
not a modal wall. Target beats:

| Beat | Player learns | Trigger |
|------|---------------|---------|
| 1 | Build a **Crop Farm** on the empty slot | Auto‑prompt at start |
| 2 | **Assign workers** to the farm | After build completes |
| 3 | Watch the **first harvest** flow to HQ; read the RED line warning | First production tick |
| 4 | **Sell** the harvest on the spot market | Storage reaches 50% |
| 5 | **Upgrade the dirt road** to see throughput jump | After first sale |
| 6 | **Acquire** the adjacent water/mineral hex | Cash ≥ \$1,200 |
| 7 | **Connect** the new hex to HQ | New hex acquired |
| 8 | Open the **Tech Tree**; research first automation node | Cash ≥ \$3,000 |

After beat 8 the tutorial hands off and the mentor becomes an optional advisor.

## 3.4 Starting Economy Snapshot

At `t = 0`, a well‑played opening looks like:

```
Cash:           $500
Income/day:     $0        (nothing producing yet)
Upkeep/day:     $12       (HQ maintenance + 5 workers × base wage)
Runway:         ~41 days  (before build) → the pressure to produce is immediate
Net worth:      ~$1,050   (start hex + HQ + starting assets)
```

The **negative daily balance at start is intentional**: it forces the player to
get a farm producing quickly, teaching the core loop under gentle time pressure
(bankruptcy grace is 5 days of *negative cash*, not negative flow — see §12).

## 3.5 Early Strategic Choices (design intent)

The opening presents a classic tycoon fork by ~day 5:

- **Wide (farmer path):** claim cheap farmland neighbors, build a stable food
  economy, low pollution, slow but safe.
- **Tall (industrial path):** save for the nearby oil/mineral hex, accept
  pollution and a bigger connection bill, higher ceiling, higher risk.
- **Trader path:** under‑build, over‑trade — use starting cash to speculate on
  the market before producing much (high skill, high variance).

None is "correct"; balancing (Appendix F) ensures all three reach mid‑game.

## 3.6 Player Profile / Company Identity

At new‑game the player names their **company** and picks a **starting perk**
(one of three, mild — not build‑defining):

| Perk | Effect | Fits |
|------|--------|------|
| **Green Thumb** | +15% crop yield, +10% pollution soak | Farmer path |
| **Wildcatter** | −20% oil/mineral building cost | Industrial path |
| **Sharp Broker** | −25% market transaction fees, +1 futures slot | Trader path |

The chosen company name/color is used on the map, market, and in AI "news"
headlines (flavor).

---
[← Hex Map System](02-hex-map-system.md) · [Next: Buildings & Extraction →](04-buildings-extraction.md)
