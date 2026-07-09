# 6. Economy & Stock Market

HexWorld runs a **living market**. Prices move on global supply/demand, *your*
production, competitor actions, random events, and seasonal cycles. The market
is not a menu — it is an adversary and a tool.

## 6.1 Currencies & Ledger

| Item | Symbol | Notes |
|------|:------:|-------|
| **Cash** | \$ | Liquid money. Bankruptcy at sustained negative (§12). |
| **Net Worth** | NW | Cash + asset value + inventory@market − liabilities. Win metric. |
| **Credit line** | — | Unlocked HQ L2+. Borrow up to `0.5 × NW` at daily interest. |

`NetWorth = Cash + Σ(hex value) + Σ(building value) + Σ(inventory × marketPrice)
            + Σ(equity holdings) − Σ(loans + margin)`.

## 6.2 Tradable Resources & Reference Prices

Reference (equilibrium) prices `P_base` per unit. Actual price floats around
these (see §6.4). Volatility class drives how wildly each swings.

| Resource | Tier | `P_base` (\$/unit) | Volatility | Demand elasticity ε |
|----------|:----:|:------------------:|:----------:|:-------------------:|
| Crops | Raw | 4 | Med | 0.9 |
| Meat | Raw | 9 | Med | 0.8 |
| Timber | Raw | 5 | Low | 0.7 |
| Lumber | Refined | 11 | Low | 0.7 |
| Crude Oil | Raw | 14 | **High** | 1.2 |
| Ore | Raw | 12 | Med | 1.0 |
| Stone | Raw | 6 | Low | 0.6 |
| Water | Raw | 3 | Low (spikes in drought) | 1.4 |
| Fuel | Refined | 34 | **High** | 1.1 |
| Metal | Refined | 30 | Med | 0.9 |
| Goods | Refined | 42 | Med | 0.8 |
| Power | Enabler | 8 | Med | 1.0 |

**Elasticity ε** governs how strongly the supply/demand ratio moves price:
higher ε = more violent swings (Crude, Water in drought).

## 6.3 Player Actions on the Market

| Action | Requires | Effect |
|--------|----------|--------|
| **Sell spot** | Inventory in hub | Convert units → cash at current price (minus fee). Large sells **push price down** (§6.4 PlayerInfluence). |
| **Buy spot** | Cash | Acquire units (for refining inputs or speculation). |
| **Buy / Sell Futures** | HQ L2 | Lock a price for delivery N days out. Hedge or speculate. |
| **Invest in equities** | HQ L3 | Buy shares of AI corporations; earn dividends / capital gains; step toward **takeover** (§10). |
| **Short sell** | HQ L3 | Bet a resource/company falls. Margin required; margin calls possible. |
| **Manipulate** | Capital + risk | Deliberately dump/corner a resource to move price (§6.6). |
| **Hedge** | Futures/options | Offset disaster risk (e.g., long Water futures before a forecast drought). |

**Transaction fee:** `0.5%` of trade value (`0.375%` with Sharp Broker perk),
min \$1. Fees make hyper‑frequent flipping unprofitable — encourages positioning.

## 6.4 Market Price Formula

The requested base relation — *Price = GlobalDemand − GlobalSupply +
PlayerInfluence* — is formalized as a **mean‑reverting supply/demand model with
momentum, seasonality, and noise**:

```
Price_t = P_base
        × ( Demand_t / Supply_t ) ^ ε           # supply/demand pressure
        × SeasonMult(resource, season)          # seasonal cycle
        × (1 + PlayerInfluence)                 # your market weight
        × (1 + Momentum_t)                       # trend/mean-reversion term
        × (1 + Noise_t)                          # bounded random walk
Price_t = clamp(Price_t, 0.25×P_base, 4×P_base) # circuit breakers
```

Where:

| Term | Definition |
|------|------------|
| **Demand_t** | Global baseline demand + event/season shifts + AI consumption. |
| **Supply_t** | Global baseline supply + **your** sold volume + AI sold volume. |
| **PlayerInfluence** | `+k × (yourRecentSell − yourRecentBuy) / marketDepth`. Selling a lot → *negative* (price down); cornering → positive. `k≈0.15`. This is the "you crash your own price" term. |
| **Momentum_t** | `0.7 × Momentum_{t−1} + 0.3 × (Price_{t−1}/EMA − 1)` then mean‑reverts. Creates trends and rebounds. |
| **Noise_t** | Bounded random walk, amplitude = volatility class × difficulty volatility mult. |
| **SeasonMult** | See §6.5. |

> **The critical loop:** flooding the market with your own resource raises
> `Supply_t` *and* pushes `PlayerInfluence` negative → price falls → your marginal
> unit earns less. Optimal play **spreads sells across ticks/resources** and uses
> **refining** to escape raw‑commodity gluts.

**Market depth** (liquidity) per resource caps how much you can move price;
thin markets (Fuel, Crude) move a lot on your volume, deep markets (Crops)
barely budge. Depth grows over the campaign as the "world economy" scales.

## 6.5 Seasonal Cycles

Four seasons (28 days each). `SeasonMult` on **price** and separate modifiers on
**production**:

| Resource / effect | Spring 🌱 | Summer ☀️ | Autumn 🍂 | Winter ❄️ |
|-------------------|:--------:|:--------:|:--------:|:--------:|
| Crops price | 1.05 | 0.90 (harvest glut) | 0.95 | 1.20 (scarcity) |
| Crops production | +10% | +20% | +5% | −25% |
| Fuel/Power price | 0.95 | 1.00 | 1.05 | **1.30** (heating) |
| Water price | 1.00 | **1.25** (irrigation demand) | 1.00 | 0.95 |
| Timber production | +5% | +10% | 0% | −15% |
| Construction cost | 1.00 | 1.00 | 1.00 | 1.10 (winter build) |

Seasons create a **rhythm**: stockpile crops in summer, sell in winter; sell
fuel in winter, buy in spring. Skilled players trade the calendar.

## 6.6 Market Manipulation (advanced, high‑risk)

| Tactic | How | Payoff | Risk |
|--------|-----|--------|------|
| **Corner** | Buy up most of a thin resource, then set your ask high | Sell your production at inflated prices | Ties up capital; AI/event can break the corner; regulator fine if extreme |
| **Dump** | Sell huge volume to crash price | Bankrupt a competitor reliant on that resource; buy back cheap | You eat the crash too; PlayerInfluence hurts you |
| **Pump via futures** | Buy aggressive futures to signal demand | Spot price drifts up; sell spot into it | Momentum can reverse; margin calls |
| **Bear raid** | Short a competitor's stock + dump their key resource | Depress their equity; cheaper takeover | Regulatory scrutiny; backfire if they're hedged |

A **Regulator** meter tracks manipulation. Cross thresholds → **fines**,
**forced position unwind**, or (endgame) **antitrust action** capping your
market share. Manipulation is powerful but self‑limiting by design.

## 6.7 Futures, Options & Hedging

- **Future:** obligation to buy/sell `X` units of a resource at price `F` on day
  `D`. Settles at spot; profit = `(spot − F) × X` for a long. Used to **hedge**
  (lock input costs / output revenue) or **speculate**.
- **Option (T4 finance tech):** the *right* not obligation; costs a premium.
- **Hedging example:** Forecast says drought in 6 days (Water spikes). You hold
  Water‑hungry Hydroponics. Buy Water futures now → when the spike hits, futures
  gains offset your higher input costs. Disaster neutralized.

## 6.8 Equities & Company Investing

- Each AI corporation has a **share price** driven by its net worth, hex count,
  and recent performance (same engine as resource prices, applied to a firm).
- Buy shares → **dividends** + capital gains + **influence** toward a **hostile
  takeover** (own >50% of shares → absorb their hexes; §10).
- AI corps may also buy **your** shares if you go public (HQ L4 IPO option),
  injecting cash but risking a takeover *against you* (loss condition, §12).

## 6.9 Economic Reports & Signals

The game surfaces **signals** so trading is skill, not luck:

- **Price ticker** with 1D / 7D / season sparklines per resource.
- **Supply/Demand gauge** per resource (are you in glut or scarcity?).
- **Forecast panel** (T2 tech): probabilistic event & season outlook (e.g.,
  "Drought risk: 35% within 7 days").
- **Your market share** per resource (how much of global supply is *you* — high
  share = you move the price = trade carefully).

---
[← Connections](05-connections.md) · [Next: Map Overview UI →](07-ui-mockups.md)
