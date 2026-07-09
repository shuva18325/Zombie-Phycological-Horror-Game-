# Appendix G — Optional Expansions

Post‑launch and stretch‑goal ideas. None are required for the core game; each is
scoped so it could ship as a standalone content update without reworking the
base systems. Ordered roughly by value‑to‑effort.

## G.1 New Game+ & Legacy Perks *(low effort, high retention)*

On victory, start a fresh map carrying one **Legacy Perk** and a harder seed
pool. Perks are meaningful but not build‑defining:

| Legacy Perk | Effect |
|-------------|--------|
| **Old Money** | Start with \$2,500 and HQ L2. |
| **Trailblazer** | Paved Roads unlocked from the start. |
| **Clean Hands** | Pollution accrues 25% slower permanently. |
| **Market Veteran** | Futures & Forecast available Era 1. |
| **Landed Gentry** | Start owning 3 hexes instead of 1. |

Stacks up to 3 perks over multiple wins → deep mastery loop.

## G.2 Multiplayer / Shared Map *(high effort)*

- **Competitive (2–4 players):** humans replace AI corps on one 60‑hex map;
  auctions, takeovers, and market manipulation become PvP. Turn‑paced or
  real‑time‑with‑server‑tick.
- **Co‑op mergers:** two players run one conglomerate, splitting logistics and
  trading duties.
- **Async "market league":** everyone plays the same daily seed solo;
  leaderboards rank Legacy Score. (Cheapest MP‑flavored option.)

## G.3 Campaign / Scenario Mode *(medium effort)*

Hand‑authored 60‑hex maps with objectives and constraints:

| Scenario | Twist |
|----------|-------|
| **Dust Bowl** | Perpetual drought; water logistics is everything. |
| **Boomtown** | Oil‑rich map, volatile crude, refinery rush. |
| **Green Mandate** | Pollution cap halved; win clean or lose. |
| **Hostile Board** | Start post‑IPO; survive a coordinated takeover. |
| **One Hex Challenge** | Never buy a second hex — go tall or die. |

Scenarios reuse all base systems; only the seed, constraints, and win rules
change — very high content‑per‑effort.

## G.4 Deeper Systems *(medium/high effort)*

| System | Adds |
|--------|------|
| **Weather map & climate drift** | Multi‑season climate trends; long‑term terraforming meta. |
| **Worker individuality** | Named workers with skills, loyalty, and career growth (cozy hook). |
| **Supply contracts** | Lock long‑term B2B deals with AI corps for stable revenue vs. spot risk. |
| **R&D projects** | Randomized tech "breakthroughs" for variety between runs. |
| **Infrastructure disasters** | Dam breaks, refinery fires — high‑stakes cascade events. |
| **Tourism / towns** | Clean, developed hexes spawn towns that buy Goods at a premium (pro‑eco incentive). |

## G.5 Quality‑of‑Life / Cozy Layer *(low effort, broad appeal)*

- **Photo mode & map postcards** of your empire.
- **Company customization** (logo, palette, HQ cosmetics).
- **Advisor personalities** (the Old Farmhand mentor gets siblings with
  different advice styles).
- **Seasonal festivals** — small positive events with cosmetic flair.
- **"Zen" sandbox** — no fail states, infinite money toggle, pure builder.

## G.6 Platform & Meta *(varies)*

- **Daily Challenge** (fixed seed, global leaderboard) — already supported by
  deterministic map gen (§2.7).
- **Mod support**: expose the resource/building/event tables (they are already
  data‑driven in this design) as editable data files.
- **Steam Workshop** for custom scenarios & tuning packs.
- **Mobile port**: the pause‑planning design and overlay UI are touch‑friendly;
  the main work is input, not systems.

## G.7 Cut‑Line Guidance

If scoping down for a first release, ship in this order and cut from the bottom:

```
CORE (must ship):  Hex map · Buildings · Connections · Market · Events ·
                   AI competitors · Tech tree · Win/Loss · Overlays UI
NICE (v1.x):       New Game+ · Scenarios · Forecast/hedging depth · Regional Hubs
LATER (v2+):       Multiplayer · Worker individuality · Climate drift · Mod support
```

---
[← Appendix F — Balancing](appendix-f-balancing.md) · [Back to Index](README.md)
