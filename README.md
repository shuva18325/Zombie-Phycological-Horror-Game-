# HexWorld Tycoon — Game Design Document

> A farming × industrial economic tycoon game played on a **60‑hexagon map**.
> Start as a broke farmer with one hex and \$500; grow into an industrial empire
> by farming, drilling, mining, trading, and — above all — **building the
> transport network that connects your hexes**.

**Tone:** cozy farming warmth over hardcore economic strategy.

---

## 📖 Read the full design document

The complete GDD lives in [`docs/`](docs/README.md) — start there for the table
of contents.

| Section | |
|---------|---|
| [1. Game Overview](docs/01-overview.md) | Pitch, tone, core loop, pacing |
| [2. Hex Map System](docs/02-hex-map-system.md) | Terrain, attributes, **map generation logic** |
| [3. Player Start](docs/03-player-start.md) | Starting loadout & onboarding |
| [4. Buildings & Extraction](docs/04-buildings-extraction.md) | Full building catalog & chains |
| [5. Connection Lines](docs/05-connections.md) | **The core mechanic** — red/yellow/green logistics |
| [6. Economy & Stock Market](docs/06-economy-stock-market.md) | Living market, futures, manipulation |
| [7. Map Overview UI](docs/07-ui-mockups.md) | Text mockups & overlays |
| [8. Progression & Tech Tree](docs/08-progression-tech-tree.md) | Four eras, full upgrade trees |
| [9. Events System](docs/09-events.md) | Full event tables |
| [10. AI Competitors](docs/10-ai-competitors.md) | Personalities & behavior tables |
| [11. Connections](docs/11-social-connections.md) | Business / Love / Family social system + Wife NPC |
| [12. Win & Loss Conditions](docs/12-win-loss.md) | Victory routes & failure states |
| [13. Formulas](docs/13-formulas.md) | Full simulation math spec |
| [Appendix A — Resources](docs/appendix-a-resources.md) | Resource tables |
| [Appendix F — Balancing](docs/appendix-f-balancing.md) | Tuning notes |
| [Appendix G — Expansions](docs/appendix-g-expansions.md) | Optional expansions |

---

## Design pillars

1. **Every hex is a decision** — 60 hand‑seeded tiles, each with a distinct role.
2. **The line is the game** — extraction is easy; *routing goods* is the challenge.
3. **Markets bite back** — over‑produce and you crash your own prices.
4. **Cozy surface, ruthless depth** — warm onboarding hiding a spreadsheet economy.
5. **Pollution is a debt you pay later** — every shortcut accrues eco‑risk.

## Status

Complete design draft (v1.0). This repository is documentation — a full,
build‑ready specification of mechanics, systems, formulas, UI, progression,
economy, and world simulation.

## License

[MIT](LICENSE)
