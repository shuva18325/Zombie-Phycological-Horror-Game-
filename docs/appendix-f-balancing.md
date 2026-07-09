# Appendix F — Balancing Notes

Tuning philosophy, target curves, difficulty multipliers, and the constants a
designer should touch **first** when the game feels off. Numbers here are
**starting points for playtesting**, not gospel.

## F.1 Balancing Philosophy

1. **The line, not the building, is the bottleneck.** Building output scales
   faster than connection cap on purpose, so players are always tempted to
   over‑build a hex and then feel the "backed up" pain. Keep `LevelMult`
   climbing steeper than `Cap` tiers.
2. **Punish monoculture gently.** Self‑crash (`PlayerInfluence`, §13.2) should
   make selling 100% of one resource ~15–25% less efficient than a diversified
   spread — enough to notice, not enough to feel scripted.
3. **Pollution is a slow clock, not a trap.** A player ignoring eco tech should
   hit the disaster track around **late Era 3**, with ~2 in‑game seasons of
   warning. Never sooner (feels unfair), never never (feels toothless).
4. **Every loss telegraphed.** Tune grace periods so a paying‑attention player
   can always recover once; a careless one cannot recover twice.
5. **All three opening paths (wide/tall/trader) reach mid‑game.** If playtests
   show one path dominating pre‑Era‑3, adjust starting perk strength and
   acquisition costs before touching yields.

## F.2 Target Economic Curve (Standard difficulty)

| In‑game time | Net worth (target) | Hexes owned | Era |
|:------------:|:------------------:|:-----------:|:---:|
| Day 0 | \$1,050 | 1 | 1 |
| Season 1 end | \$8k–15k | 2–3 | 1 |
| Year 1 | \$40k–70k | 4–6 | 2 |
| Year 2 | \$150k–300k | 7–10 | 2–3 |
| Year 3 | \$600k–1.2M | 11–16 | 3 |
| Year 4 | \$2M–3.5M | 16–22 | 3–4 |
| Year 5 | \$4M–7M | 22–30 | 4 |
| Year 6–7 | \$10M+ (win) | 30–40+ | 4 |

If real playtests deviate >30% from this band for a *median* player, retune
(usually market depth, refining margins, or acquisition costs).

## F.3 Difficulty Multipliers

| Parameter | Cozy | Standard | Tycoon | Ironman |
|-----------|:----:|:--------:|:------:|:-------:|
| `START_CASH` | \$1,500 | \$500 | \$300 | \$300 |
| Event base prob (`×`) | 0.5 | 1.0 | 1.35 | 1.5 |
| Event severity (`×`) | 0.6 | 1.0 | 1.25 | 1.5 |
| Market volatility `σ_vol` (`×`) | 0.6 | 1.0 | 1.4 | 1.6 |
| AI decision quality | Low | Med | High | Ruthless |
| AI income bonus | 0% | 0% | +5% | +10% |
| RP cost (`×`) | 0.85 | 1.0 | 1.15 | 1.25 |
| Bankruptcy rescue | Yes (1) | Yes (1) | No | No |
| `POLLUTION_CAP` grace | Generous | Standard | Tight | Tight |
| Maintenance/wages (`×`) | 0.85 | 1.0 | 1.1 | 1.2 |

## F.4 Key Tuning Constants (touch these first)

| Constant | Value | Effect if raised | Effect if lowered |
|----------|:-----:|------------------|-------------------|
| `k` (PlayerInfluence) | 0.15 | Harsher self‑crash; more diversification | Weaker; monoculture viable |
| `DIFFUSION` | 0.15 | Pollution spreads faster; green buffers matter more | More containable |
| `DistanceFactor` slope | 0.10/hop | Hubs/drones more essential | Big maps easier |
| `LevelMult` L5 | 3.75 | Tall play stronger | Wide play favored |
| Refining margin | 2–4× | Vertical integration dominates | Raw trading viable longer |
| `BANKRUPT_GRACE` | 5 days | More forgiving | Harsher |
| Auction ceiling (AI) | 1.05–1.35× | AIs out‑bid player more | Player expands freely |
| `BASE_BREAK` | 0.002 | Maintenance discipline matters more | Set‑and‑forget |

## F.5 Anti‑Degenerate‑Strategy Guards

| Exploit | Guard |
|---------|-------|
| **Spam‑sell one resource** | `PlayerInfluence` self‑crash + transaction fees + market depth caps. |
| **Ignore pollution forever** | Global pollution disaster loss + morale penalties + eco‑levy taxes. |
| **Turtle on one perfect hex** | Depletion (finite oil/mineral) + AIs claim the map + market share can't hit 50% from one hex. |
| **Infinite loan spiral** | Credit capped at `0.5×NW`, interest rises with debt & rate‑hike events. |
| **Corner every market** | Regulator meter → fines, forced unwind, antitrust share‑cap. |
| **Cheese futures** | Margin calls, momentum reversals, options premiums, position limits per HQ level. |

## F.6 Playtest Metrics to Watch

Instrument these during balancing:

- **Median net worth per year** vs. F.2 band.
- **% of income from refined vs. raw** (should cross 50% by Era 3).
- **Average connection state distribution** (too many green = lines too cheap).
- **Pollution disaster rate** among players who ignore eco (target: ~loss in
  Era 3–4, not earlier).
- **Win‑path distribution** (all four victories should be *someone's* fastest).
- **First‑loss cause histogram** (bankruptcy should dominate early; takeover &
  pollution late — if pollution dominates early, `DIFFUSION`/emissions too high).
- **AI hex share over time** (AIs should hold 30–50% mid‑game, shrinking as the
  player wins — not snowballing past the player on Standard).

## F.7 Economy Sink/Source Ledger

Healthy tycoon economies need matched sinks and sources. HexWorld's:

| Sources (money in) | Sinks (money out) |
|--------------------|-------------------|
| Resource sales | Building & connection construction |
| Refined goods & exports | Maintenance & wages |
| Dividends / capital gains | Terraform / specialize / reclaim |
| Subsidies / windfalls (events) | Research (indirect, via labs) |
| Takeover asset absorption | Taxes, fees, eco‑levies |
| Futures/short profits | Loan interest, margin, fines, repairs |

The **construction + maintenance** sink is the primary money drain and the main
lever for pacing: if players are too rich, raise connection/maintenance costs
before nerfing yields (players resent yield nerfs more than cost inflation).

---
[← Appendix A — Resources](appendix-a-resources.md) · [Next: Appendix G — Expansions →](appendix-g-expansions.md)
