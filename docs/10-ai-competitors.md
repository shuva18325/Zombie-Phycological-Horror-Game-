# 10. AI Competitors

The map is shared with **3–4 AI corporations** that play by (mostly) the same
rules: they claim hexes, build, connect, trade, manipulate markets, and attempt
**hostile takeovers**. They are the game's **pace‑setters** — no hard timer is
needed because the AIs will grab the good hexes if the player dithers.

## 10.1 AI Corporation Model

Each AI is a lightweight economic agent running a **utility‑scored decision
loop** each AI turn (once per in‑game day, offset from the player):

```
each AI day:
    perceive()      # read own cash, hexes, market, player & rivals
    score()         # rate candidate actions with a weighted utility fn
    act()           # execute top-scoring affordable action(s)
    react()         # respond to threats (undercut, defend, retaliate)
```

Candidate actions (same verb set as the player): **AcquireHex, BuildBuilding,
UpgradeBuilding, LayConnection, UpgradeConnection, SellResource, BuyResource,
Manipulate, BuyRivalShares, TakeoverBid, Sabotage, Research.**

Utility weights come from the AI's **personality** (§10.3). A "fog of
competence" scales how optimally it plays with difficulty (Appendix F), so AIs
feel smart without being omniscient — they misjudge the market like a player.

## 10.2 AI Difficulty Bands

| Band | Decision quality | Cheats? | Cadence |
|------|------------------|---------|---------|
| Low (Cozy) | Greedy, short‑horizon; ignores manipulation | None | Slow (acts every 2 days) |
| Medium (Standard) | 2‑step lookahead; basic hedging | None | Daily |
| High (Tycoon) | 3‑step lookahead; uses futures & undercutting | Mild economy‑of‑scale bonus | Daily, faster builds |
| Ruthless (Ironman) | Coordinated pressure; targets player's weak resource | +10% income, foresight on 1 event | Twice daily |

> AIs on higher bands get *tempo* and *slightly* better numbers — never hidden
> information beyond one telegraphed event. All AI holdings are inspectable.

## 10.3 AI Personalities (requested set)

Each corp is assigned one personality at map‑gen, giving it a distinct feel and
counter‑strategy.

| Personality | Priorities | Signature behavior | Weakness / counter |
|-------------|-----------|--------------------|--------------------|
| **Aggressive** | Expansion, sabotage | Grabs hexes fast, first to sabotage, over‑extends | Thin cash reserves → dump their key resource / bear raid |
| **Economic** | Margins, market share | Undercuts prices, hoards a commodity, hedges well | Slow to expand → out‑claim hexes while they optimize |
| **Eco‑Friendly** | Low pollution, renewables, subsidies | Builds clean, earns eco‑subsidies, avoids oil | Lower raw throughput → beat them on heavy industry volume |
| **Chaotic** | Unpredictable, opportunistic swings | Random pivots, occasional brilliant/terrible plays, loves manipulation | Inconsistent → exploit their overreactions; don't mirror them |
| **Opportunistic** | React to others, buy the dip | Waits, then pounces on your weak moment / cheap hexes | Passive early → build an unassailable lead before they strike |

## 10.4 AI Behaviors (requested capabilities)

| Behavior | How the AI does it |
|----------|--------------------|
| **Expand hexes** | Scores neutral hexes by `expectedProfit / (acquireCost + connectCost)`; bids in auctions up to a personality‑set ceiling. |
| **Manipulate markets** | Economic/Chaotic AIs dump or corner thin resources to shift price; tracked by same Regulator meter as player. |
| **Compete for resources** | Prefers hexes whose resource it already refines (vertical integration), racing the player to oil/mineral clusters. |
| **Build faster networks** | Prioritizes connection upgrades on its trunk; higher bands build quicker (tempo bonus). |
| **Hostile takeovers** | If it accumulates >40% of the player's public shares (post‑IPO) or you over‑leverage, it launches a **Takeover Bid** (§10.6). |

## 10.5 AI Interaction With the Player

- **Hex competition:** contested neutral hexes trigger a **sealed‑bid auction**
  (§2.9). AIs bid to their personality ceiling; bluffing and information matter.
- **Market pressure:** an AI flooding *your* main resource crashes your income —
  the game nudges you toward **diversification** and **refining** to escape.
- **Diplomacy‑lite:** no formal alliances, but you can **buy their shares**
  (income + takeover path) or **sell them resources** (they'll pay a premium
  when short). Chaotic/Opportunistic AIs may propose one‑off deals.
- **Rivalry heat:** each AI tracks a **grudge** toward whoever hurt it most;
  high grudge → more sabotage/undercut aimed at that party (can be the player
  *or* another AI — AIs fight each other too).

## 10.6 Hostile Takeover (both directions)

```
Takeover readiness (attacker → target):
    sharesOwned% ≥ 50    → outright control (absorb target's hexes)
    40% ≤ shares < 50    → Takeover Bid event: pay premium to buy remaining
    target defenses:
        • Buy back own shares (needs cash)
        • Poison pill (T‑Finance): dilute attacker on trigger
        • Stay private (don't IPO) → cannot be share‑raided at all
```

- **You → AI:** accumulate an AI's shares via the market; on control, **absorb
  its hexes and connections** — a fast‑forward to map dominance (a win path).
- **AI → You:** only possible if you **IPO** (HQ L4) or over‑leverage. If an AI
  gains control of *you*, that's a **loss** (§12). IPO is optional risk/reward
  cash — the game warns before you expose yourself.

## 10.7 Endgame AI Escalation

As the player nears a win threshold, surviving AIs enter **"consolidation"**:
they merge (weaker AI absorbed by stronger), pool capital, and coordinate market
pressure on the player's dominant resource — a soft **rubber‑band** that makes
the final stretch tense without cheating. Winning through this pressure is the
intended climax.

---

## Appendix C — AI Behavior Tables  <a id="appendix-c--ai-behavior-tables"></a>

### C.1 Utility Weights by Personality

Higher weight = the AI values that action more when scoring. (0–10 scale.)

| Action \ Personality | Aggressive | Economic | Eco‑Friendly | Chaotic | Opportunistic |
|----------------------|:----------:|:--------:|:------------:|:-------:|:-------------:|
| Acquire hex | 9 | 5 | 6 | 6* | 7 |
| Upgrade connection | 6 | 7 | 6 | 4 | 6 |
| Upgrade building | 5 | 8 | 7 | 5 | 6 |
| Sell into strength | 5 | 9 | 6 | 6 | 8 |
| Manipulate market | 4 | 8 | 2 | 9 | 7 |
| Sabotage rival | 8 | 3 | 1 | 7 | 5 |
| Buy rival shares | 5 | 6 | 3 | 6 | 8 |
| Research/eco | 3 | 6 | 9 | 4 | 5 |
| Hoard cash (defense) | 2 | 6 | 5 | 3 | 7 |

`*` Chaotic weights are perturbed by ±3 random each turn — that's the chaos.

### C.2 Personality Tuning Constants

| Personality | Risk tolerance | Auction ceiling (× fair value) | Cash floor kept | Expansion pace | Grudge decay |
|-------------|:--------------:|:------------------------------:|:---------------:|:--------------:|:------------:|
| Aggressive | High (0.85) | 1.35 | 5% | Fast | Slow (holds grudges) |
| Economic | Low (0.35) | 1.05 | 25% | Slow | Fast |
| Eco‑Friendly | Med (0.5) | 1.10 | 20% | Med | Fast |
| Chaotic | Very High (0.95) | 0.8–1.6 (random) | 10% | Erratic | Random |
| Opportunistic | Med (0.55) | 1.20 (only when cheap) | 30% | Reactive | Med |

### C.3 Threat Response Matrix

| Trigger (from player/rival) | Aggressive | Economic | Eco | Chaotic | Opportunistic |
|-----------------------------|-----------|----------|-----|---------|---------------|
| You undercut their resource | Sabotage you | Undercut back / corner | Diversify away | Random escalate | Wait, then dump on you |
| You out‑expand them | Race harder, over‑extend | Focus margins | Grab clean niches | Pivot resource | Buy your dip later |
| You buy their shares | Buy back aggressively | Poison pill | Buy back calmly | Ignore or counter‑raid | Counter‑buy your shares |
| A disaster hits you | Press advantage (sabotage) | Undercut while weak | Offer aid deal (flavor) | Unpredictable | **Pounce** (best time) |
| Global market crash | Panic‑sell | Hedge (was short) | Ride renewables | Wild bets | Buy the bottom |

### C.4 AI Starting Loadout

Each AI starts symmetric‑ish to the player but seeded to its identity:

| AI | Start terrain bias | Start cash | Start focus |
|----|--------------------|:----------:|-------------|
| Aggressive corp | Near an oil/mineral cluster | \$700 | Heavy extraction |
| Economic corp | Central, many neutral neighbors | \$600 | Trading + margins |
| Eco corp | Forest/water rich | \$650 | Clean farming + renewables |
| Chaotic corp | Random | \$500–900 (random) | Anything |
| Opportunistic corp | Edge of map, room to grow | \$650 | Reactive expansion |

---
[← Events](09-events.md) · [Next: Connections →](11-social-connections.md)
