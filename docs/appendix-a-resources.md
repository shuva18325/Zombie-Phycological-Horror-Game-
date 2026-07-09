# Appendix A — Resource Tables

The complete resource reference for HexWorld Tycoon: what exists, where it comes
from, what it turns into, and roughly what it's worth.

## A.1 Master Resource List

| Resource | Class | Fluid? | Source building(s) | `P_base` | Volatility | Primary use |
|----------|-------|:------:|--------------------|:--------:|:----------:|-------------|
| **Crops** | Raw | no | Crop Farm, Greenhouse, Hydroponics | 4 | Med | Food chain, livestock feed |
| **Meat** | Raw | no | Livestock Farm | 9 | Med | Food processing, sale |
| **Timber** | Raw | no | Logging Camp | 5 | Low | Lumber input |
| **Lumber** | Refined | no | Sawmill (from Timber) | 11 | Low | Furniture, sale |
| **Crude Oil** | Raw | **yes** | Oil Drill, Pumpjack | 14 | High | Refining → Fuel |
| **Ore** | Raw | no | Ore Mine | 12 | Med | Smelting → Metal |
| **Stone** | Raw | no | Quarry | 6 | Low | Construction discount, sale |
| **Water** | Raw | **yes** | Pump Station | 3 | Low* | Irrigation, hydroponics, refining |
| **Fuel** | Refined | **yes** | Oil Refinery (from Crude) | 34 | High | Power, sale, export |
| **Metal** | Refined | no | Smelter (from Ore) | 30 | Med | High‑value sale, export |
| **Goods** | Refined | no | Food Processor, Furniture Works | 42 | Med | Highest‑value sale, export |
| **Power** | Enabler | n/a | Power Plant, Renewables | 8 | Med | Runs Hydroponics/automation |
| **RP** | Meta | n/a | Research Lab, activity | — | — | Tech tree progression |

`*` Water is low‑volatility normally but **spikes hard in droughts** (ε 1.4).

## A.2 Resource Tiers & Margins

| Tier | Members | Role | Typical margin |
|------|---------|------|:--------------:|
| **Raw** | Crops, Meat, Timber, Crude, Ore, Stone, Water | Early income, refinery feedstock | Low (commodity) |
| **Refined** | Lumber, Fuel, Metal, Goods | Mid/late income; escape self‑crash | High (2–4× inputs) |
| **Enabler** | Power, Stone | Unlock/discount, rarely main income | Indirect |
| **Meta** | RP | Progression currency | — |

## A.3 Refining Ratios (value‑add web)

| Output | Recipe (per output batch) | Rough value uplift |
|--------|---------------------------|:------------------:|
| Lumber | 2 Timber → 1 Lumber | 5→11 (≈2× per unit‑in) |
| Fuel | 8 Crude → 6 Fuel (+ Power upkeep) | 14→34 (≈2.4×) |
| Metal | 8 Ore → 5 Metal | 12→30 (≈2.5×) |
| Goods (food) | 6 Crops + 3 Meat → 7 Goods | mixed → 42 (≈3–4×) |
| Goods (furniture) | 6 Lumber → 6 Goods | 11→42 (≈3.8×) |
| Power | 6 Fuel → 20 Power (or renewable) | enabler |

> **Design read:** refining roughly doubles‑to‑quadruples per‑unit value **and**
> shrinks the volume you dump on the raw market — so it fights the self‑crash
> twice. The trade‑off is worker load, pollution (except renewables), and the
> tech/connection investment to feed the refinery.

## A.4 Resource → Terrain Affinity Matrix

Which terrains best produce each raw resource (★ = best fit):

| Resource | Farmland | Forest | Oil | Mineral | Water | Industrial |
|----------|:--------:|:------:|:---:|:-------:|:-----:|:----------:|
| Crops | ★★★ | · | · | · | ★ (via hydro) | · |
| Meat | ★★★ | ★ | · | · | · | · |
| Timber | · | ★★★ | · | · | · | · |
| Crude | · | · | ★★★ | · | · | · |
| Ore | · | · | · | ★★★ | · | · |
| Stone | · | · | · | ★★ | · | ★ |
| Water | · | ★ | · | · | ★★★ | · |
| (Refined) | · | · | · | · | · | ★★★ |

## A.5 Storage & Sell Guidance (quick tips surfaced in‑game)

| Resource | Stockpile? | Sell timing hint |
|----------|:----------:|------------------|
| Crops | Yes (Autumn glut) | Sell Winter (scarcity, +20%) |
| Fuel | Yes | Sell Winter (heating demand +30%) |
| Water | Situational | Sell into droughts / Summer irrigation demand |
| Crude | Refine, don't dump | Convert to Fuel to escape high volatility |
| Metal/Goods | Spread sells | Deep‑ish markets; export routes (T4) for +25% |

## A.6 Global Richness Sanity Band

The generator (§2.7) targets **total map yield ∈ [300, 360]** across all 60
hexes so no seed is starved or trivially rich. Approximate contribution:

| Terrain | Count | Avg yield | Subtotal |
|---------|:-----:|:---------:|:--------:|
| Farmland | 18 | 5.5 | 99 |
| Forest | 10 | 6.5 | 65 |
| Oil | 6 | 7.5 | 45 |
| Mineral | 8 | 7.0 | 56 |
| Water | 8 | 7.0 | 56 |
| Industrial | 10 | 3.5 | 35 |
| **Total** | **60** | — | **~356** ✅ |

---
[← Formulas](13-formulas.md) · [Next: Appendix F — Balancing →](appendix-f-balancing.md)
