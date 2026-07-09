# 1. Game Overview

## 1.1 Elevator Pitch

**HexWorld Tycoon** is a farming‑to‑industry hybrid tycoon game played on a
**60‑hexagon map**. You begin as a broke farmer with a single low‑yield
hexagon, a dirt road, five workers, and \$500. By farming, drilling, mining,
logging, pumping water, trading on a live market, and — above all — **building
the transport network that connects your hexes** — you grow into a vertically
integrated industrial empire.

The twist that separates HexWorld from ordinary tycoon games: **extraction is
trivial, logistics is everything**. A rich oil field is worthless if it is
strangled by a red dirt‑road connection. The player's real job is to route
resources efficiently, read the market, and out‑maneuver AI corporations that
are doing the same thing on the same 60 tiles.

## 1.2 Tone & Fantasy

| Layer | Feel |
|-------|------|
| **Surface (early game)** | Cozy. Gentle music, forgiving economy, warm palette, "one more crop" pacing. |
| **Mid game** | Tension. Pollution rising, competitors expanding, first market crash. |
| **Late game** | Ruthless. Hostile takeovers, futures manipulation, automation arms race. |

The design deliberately **onboards players with farming warmth** and then
**escalates into hardcore economic strategy** without ever changing the core
UI language. The cozy layer never fully disappears — it becomes the emotional
counterweight to the industrial grind.

## 1.3 Core Gameplay Loop

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         │
   ACQUIRE HEX ──▶ BUILD EXTRACTION ──▶ CONNECT TO NETWORK ──▶ PRODUCE
        ▲                                                         │
        │                                                         ▼
   REINVEST ◀── SELL / TRADE ON MARKET ◀── ROUTE GOODS TO HUB ◀──┘
        │
        └──▶ UPGRADE (buildings, connections, tech) ──▶ (loop widens)
```

**One loop iteration** (~1 in‑game day) reads as:
1. Check which hexes are bottlenecked (red/yellow lines) on the **Flow overlay**.
2. Decide: upgrade a line, upgrade a building, or acquire a new hex?
3. Watch the **market ticker** — is your primary resource over‑ or under‑priced?
4. Sell into strength, stockpile into weakness, or hedge with futures.
5. Respond to any **event** (drought, strike, competitor move).
6. Spend surplus on the **tech tree** to widen the next loop.

## 1.4 Session & Macro Pacing

| Horizon | In‑game time | Player experience |
|---------|-------------|-------------------|
| **Micro** | 1 tick (1 hr) | Production & market updates tick forward. |
| **Loop** | 1 day (24 ticks) | One meaningful decision cycle. |
| **Chapter** | 1 season (28 days) | Weather shift, market regime shift, 1–2 major events. |
| **Act** | 1 year (4 seasons) | A tech era completes; competitor landscape reshuffles. |
| **Campaign** | 6–12 in‑game years | Full run: farmer → tycoon → win/loss. |

Real‑time mapping at 1× speed: **1 tick ≈ 3 seconds**, so one in‑game day is
~72 s and a full season ~34 min. Speed controls: **Pause / 1× / 2× / 4×**.
A typical campaign is **8–15 hours** of real play.

## 1.5 Player Roles / Verbs

The player is simultaneously a **Farmer**, **Extractor**, **Logistician**,
**Trader**, and **CEO**. The verbs:

- **Build** (place & level buildings on build slots)
- **Connect** (lay & upgrade connection lines between hexes)
- **Route** (assign which hub a hex feeds; balance throughput)
- **Trade** (sell/buy spot, futures, and equities)
- **Research** (spend on the tech tree)
- **Manage** (workers, morale, pollution, maintenance)
- **Compete** (bid on hexes, defend against takeovers)

## 1.6 What Makes a Run Interesting (Design Intent)

- **Scarcity of green lines.** High‑throughput infrastructure is expensive, so
  the player is *always* choosing which hex "deserves" a green line this quarter.
- **Self‑inflicted price crashes.** The market punishes over‑production, so the
  optimal strategy is diversification, not min‑maxing one resource.
- **Pollution as a slow clock.** The most efficient builds pollute; the map
  slowly degrades unless the player pays the eco‑tax of upgrades.
- **AI as pace‑setters.** Competitors grab the juicy hexes if the player dithers,
  creating natural urgency without a hard timer.

## 1.7 Accessibility & Difficulty Modes

| Mode | Start cash | Event severity | AI aggression | Market volatility |
|------|-----------|----------------|---------------|-------------------|
| **Cozy** | \$1,500 | ×0.5 | Low | ×0.6 |
| **Standard** | \$500 | ×1.0 | Medium | ×1.0 |
| **Tycoon** | \$300 | ×1.35 | High | ×1.4 |
| **Ironman** | \$300 | ×1.5, no reloads | Ruthless | ×1.6 |

Colorblind‑safe overlays are mandatory: the red/yellow/green connection states
also carry **icon + pattern** encodings (see [UI](07-ui-mockups.md#accessibility)).

---
[← Index](README.md) · [Next: Hex Map System →](02-hex-map-system.md)
