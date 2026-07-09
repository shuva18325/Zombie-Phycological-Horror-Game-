# HexWorld Tycoon — Game Design Document (GDD)

> **Genre:** Farming × Industrial Economic Tycoon (single‑player, real‑time with pause)
> **Tone:** Cozy farming warmth on top of hardcore economic strategy
> **Core fantasy:** *From one dirt‑road hexagon to a 60‑hex industrial empire.*
> **Document version:** 1.0 · **Status:** Complete design draft · **Last updated:** 2026‑07‑09

This repository contains the **complete design specification** for **HexWorld Tycoon**:
mechanics, systems, formulas, UI, progression, economy, and world simulation.

---

## 📚 Table of Contents

The document follows the requested section numbering. Section 11 is intentionally
**reserved / left blank** for the design owner.

| # | Section | File |
|---|---------|------|
| 1 | Game Overview | [`01-overview.md`](01-overview.md) |
| 2 | Hex Map System | [`02-hex-map-system.md`](02-hex-map-system.md) |
| 3 | Player Start | [`03-player-start.md`](03-player-start.md) |
| 4 | Buildings & Extraction | [`04-buildings-extraction.md`](04-buildings-extraction.md) |
| 5 | Connection Lines (Core Mechanic) | [`05-connections.md`](05-connections.md) |
| 6 | Economy & Stock Market | [`06-economy-stock-market.md`](06-economy-stock-market.md) |
| 7 | Map Overview UI | [`07-ui-mockups.md`](07-ui-mockups.md) |
| 8 | Progression & Tech Tree | [`08-progression-tech-tree.md`](08-progression-tech-tree.md) |
| 9 | Events System | [`09-events.md`](09-events.md) |
| 10 | AI Competitors | [`10-ai-competitors.md`](10-ai-competitors.md) |
| 11 | Connections (Business / Love / Family) | [`11-social-connections.md`](11-social-connections.md) |
| 12 | Win & Loss Conditions | [`12-win-loss.md`](12-win-loss.md) |
| 13 | Formulas | [`13-formulas.md`](13-formulas.md) |
| A | Appendix A — Resource Tables | [`appendix-a-resources.md`](appendix-a-resources.md) |
| B | Appendix B — Event Tables | [`09-events.md#appendix-b--full-event-table`](09-events.md) |
| C | Appendix C — AI Behavior Tables | [`10-ai-competitors.md#appendix-c--ai-behavior-tables`](10-ai-competitors.md) |
| D | Appendix D — Hex Map Generation Logic | [`02-hex-map-system.md#hex-map-generation-logic`](02-hex-map-system.md) |
| E | Appendix E — Upgrade / Tech Trees | [`08-progression-tech-tree.md`](08-progression-tech-tree.md) |
| F | Appendix F — Balancing Notes | [`appendix-f-balancing.md`](appendix-f-balancing.md) |
| G | Appendix G — Optional Expansions | [`appendix-g-expansions.md`](appendix-g-expansions.md) |

---

## 🎯 Design Pillars

1. **Every hex is a decision.** 60 hand‑seeded tiles, each with a distinct
   terrain, yield rating, and economic role. No two playthroughs read the same.
2. **The line is the game.** Extraction is easy; *moving goods* is the real
   challenge. Connection quality (red → yellow → green) gates everything.
3. **Markets bite back.** A living stock market reacts to *your* production —
   flood the market and you crash your own prices.
4. **Cozy surface, ruthless depth.** Warm art and gentle onboarding hide a
   spreadsheet‑grade economy underneath.
5. **Pollution is a currency you pay in the future.** Every efficiency shortcut
   accrues an environmental debt that can end a run.

---

## 🧭 How to Read This Document

- **Designers / balancers:** start at [Formulas](13-formulas.md) and
  [Balancing Notes](appendix-f-balancing.md).
- **Engineers:** start at [Hex Map System](02-hex-map-system.md) (generation
  logic) and [Formulas](13-formulas.md) (simulation tick order).
- **UI / UX:** start at [Map Overview UI](07-ui-mockups.md).
- **Producers / narrative:** start at [Game Overview](01-overview.md).

---

## 🔢 Global Constants (single source of truth)

These constants are referenced throughout the document. Tune here first.

| Symbol | Name | Value | Where used |
|--------|------|-------|------------|
| `TICK` | Simulation tick length | 1 in‑game hour (real: 3 s at 1×) | All systems |
| `DAY` | Ticks per in‑game day | 24 ticks | Events, wages |
| `SEASON` | Days per season | 28 days | Weather, market |
| `YEAR` | Seasons per year | 4 (Spring/Summer/Autumn/Winter) | Progression |
| `HEX_COUNT` | Total hexes on map | 60 | Map |
| `START_CASH` | Starting money | \$500 | Player start |
| `WIN_NETWORTH` | Net‑worth win threshold | \$10,000,000 | Win condition |
| `WIN_HEXES` | Hex‑control win threshold | 40 hexes | Win condition |
| `MAX_BLD_LVL` | Max building level | 5 | Buildings |
| `MAX_CONN_LVL` | Max connection tier | 4 (Dirt→Paved→Rail→Pipeline) | Connections |
| `BANKRUPT_GRACE` | Days of negative cash before loss | 5 days | Loss condition |
| `POLLUTION_CAP` | Global pollution disaster threshold | 1000 pts | Loss condition |

---

*Section 11 defines the **Connections** social system — Business, Love, and
Family relationships (see [`11-social-connections.md`](11-social-connections.md)).*
