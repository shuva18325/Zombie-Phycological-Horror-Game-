# 12. Win & Loss Conditions

HexWorld offers **multiple victory routes** (so different playstyles win their
own way) and **multiple failure states** (so different mistakes bite). A run
ends when any win or loss condition resolves.

## 12.1 Victory Conditions

A player **wins** by achieving **any one** of the following (configurable at
new‑game — "First to any" is default; "Achieve all" is a longer mastery mode):

| # | Victory | Threshold | Playstyle it rewards |
|---|---------|-----------|----------------------|
| 1 | **Wealth Victory** | Net worth ≥ **\$10,000,000** | Balanced tycoon / trader |
| 2 | **Territorial Victory** | Control **40+ of 60 hexes** | Expansionist / aggressive |
| 3 | **Market Leader Victory** | ≥ **50% global market share** across ≥3 resources for 1 full season | Economic / manipulator |
| 4 | **Automation Victory** | Achieve **full automation** (all owned buildings auto‑staffed + AI Logistics + Renewable) | Engineer / optimizer |

**Victory scoring** (for leaderboards / NG+ perks): even after the first
threshold, the game computes a **Legacy Score**:
```
Score = NetWorth/1e6 + 2×HexesControlled + 20×VictoriesAchieved
      − 0.01×PeakPollution − 5×TimesBankruptRescued + DifficultyMult
```
Winning on **Ironman with low pollution** yields the top scores — a deliberate
"clean tycoon" flex.

## 12.2 Loss Conditions

The player **loses** if any of the following resolves:

| # | Loss | Trigger | Telegraph |
|---|------|---------|-----------|
| 1 | **Bankruptcy** | Cash < \$0 for **5 consecutive days** (`BANKRUPT_GRACE`) with net worth also falling | Red cash meter; "credit denied" warning |
| 2 | **Worker Collapse** | Total staffed workforce falls below **20% of required** for **3 days** (mass strike/exodus) | Morale alerts; strike cascade |
| 3 | **Pollution Disaster** | Global pollution ≥ **1000 (`POLLUTION_CAP`)** and rising for **3 days** | Pollution warnings from 800+ |
| 4 | **Hostile Takeover** | A competitor gains **>50% of your (public) shares** and completes a takeover bid | Share‑raid alerts; only possible post‑IPO |

**Design principle:** *every loss is telegraphed and recoverable up to a point.*
Bankruptcy has a 5‑day grace; pollution warns from 800; takeover requires you to
have chosen to IPO. There are no instant, unforeseeable deaths.

## 12.3 The "Rescue" Grace (anti‑frustration)

On **Cozy/Standard**, the first time the player would go bankrupt they get a
one‑time **Emergency Restructuring**: forced asset sale + a small loan to reach
positive cash, at the cost of a Legacy Score penalty (`TimesBankruptRescued`).
On **Tycoon/Ironman**, no rescue — bankruptcy is final.

## 12.4 Loss Condition Detail

### Bankruptcy
```
if cash < 0:
    negativeDays += 1
    dailyEfficiencyPenalty += 3%     # deferred maintenance bites
    if negativeDays ≥ 5 and netWorthTrend < 0:
        → LOSS (or Rescue on Cozy/Standard, once)
else:
    negativeDays = 0
```
Escape routes: sell inventory, sell/mortgage hexes, take a loan (HQ L2+),
liquidate equities, cut maintenance temporarily.

### Worker Collapse
Driven by **morale** (§13.4). A strike (§9) that spreads via morale contagion
while the player under‑pays can cascade. Escape: raise wages, grant
concessions, automate to reduce worker dependence.

### Pollution Disaster
The slow clock. Escape: Eco Upgrades, Renewable Energy, reclaim hexes, retire
dirty buildings, keep forest/farmland green buffers. A player who ignores the
environment entirely will hit this around late Era 3 if unchecked.

### Hostile Takeover
Only exposed after **IPO** (optional, HQ L4). Escape: buy back shares, poison
pill (T‑Finance), or simply never IPO (trade cash growth for safety).

## 12.5 End‑Game Screen

```
┌──────────────── RUN COMPLETE — VICTORY: Wealth ────────────────┐
│  Company: GreenFurrow Co.        Difficulty: Tycoon            │
│  Net worth  $10.4M   Hexes 31/60   Peak pollution 340          │
│  Years played 7.2    Victories: Wealth ✔  Market ✔             │
│  Legacy Score: 4,182   (Top 12% · clean‑tycoon bonus +150)     │
│                                                                │
│  [ Continue (sandbox) ]   [ New Game+ (Legacy Perk) ]  [ Menu ] │
└────────────────────────────────────────────────────────────────┘
```

**Continue** lets the player keep going in a no‑stakes sandbox after winning
(cozy audience); **New Game+** carries a Legacy Perk (mastery audience, Appendix G).

---
[← Connections](11-social-connections.md) · [Next: Formulas →](13-formulas.md)
