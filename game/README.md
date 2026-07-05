# THE LONG NIGHT
### a 2D psychological-horror observation game

You are an ordinary homeowner, alone, on the night a zombie virus quietly
tips over into a full outbreak. You cannot fight. You cannot run far. You can
only **watch** — through your TV, your computer, your phone, and your
windows — as a normal evening curdles into catastrophe, and decide, knock by
knock, who you let past your door.

The terror is a slow descent:

* The **news** opens on mild weather and cruise tourism, then breaks the story
  of a mystery illness aboard an Atlantic cruise ship — the **Peclip Virus**.
  Broadcast by broadcast the timeline escalates: hospitals overrun, quarantine
  zones, military relocation posts, cities falling, and finally the **Eastern
  Coast Containment Wall**, a shoot-on-sight order, and four "Safe-Guarded
  Zones" — before the signal decays into static and dead air. You can replay
  every report you missed.
* **Government orders** escalate step by step: *curfew → shelter-in-place →
  martial law → the containment directive (a sweep at dawn).*
* **Helicopters** sweep low over the roof. **Soldiers** patrol the street with
  flashlights. **Sirens, screams and gunfire** drift in from a few blocks away.
* The **power flickers**, then dies. **Strange noises** move through the house
  when you know you are alone.
* Someone **knocks**. A neighbor? A soldier? A rescue team? Something that used
  to be a person? You get a few seconds and a peephole to decide: **open, or
  keep it shut.**

Manage your **stress** and your **fatigue**, brew **coffee** to stay sharp,
**barricade** the door and windows before the finale — and try to reach dawn
with your life *and* your mind intact.

---

## How to run it

This is pure **HTML + CSS + vanilla JavaScript** with **no build step, no
dependencies, and no server required**.

### Option A — just open the file
1. Download / clone this repository.
2. Open **`game/index.html`** in any modern browser (Chrome, Firefox, Edge,
   Safari).
3. Click **ENTER THE HOUSE**. (Clicking is required so the browser lets the
   game play sound.)

### Option B — run a tiny local server (recommended)
Some browsers are stricter about loading local files. If sprites or audio
don't appear when opening the file directly, serve the folder:

```bash
cd game
python3 -m http.server 8000
# then open http://localhost:8000  in your browser
```

Any static server works (`npx serve`, VS Code "Live Server", etc.).

---

## Controls

| Action | Keys |
| ------ | ---- |
| Move around the house | `W A S D` or the **arrow keys** |
| Interact (TV, computer, window, coffee, door) | `E`, `Space`, or `Enter` |
| Barricade (when next to the door or a window) | `B` |
| Open your phone (anywhere) | `P` |
| Answer a knock | `Y` = open · `N` = keep shut |
| Close a screen | `Esc` |
| Mute / unmute | `M` or the 🔊 button |

Walk up to a fixture and a prompt tells you what you can do.

---

## What to do

* **Watch the TV** to follow the Peclip Virus broadcast timeline as it airs,
  and use the on-screen **◀ EARLIER / LATER ▶** buttons to replay reports you
  missed (the newest one is marked **● LIVE**). **Read the government terminal**
  for official alerts. Staring at catastrophe raises your stress — don't live
  on the screens.
* **Peer through the windows** to see what's really happening outside.
* **Drink coffee** to burn off fatigue and steady your nerves — but too much,
  too fast, will leave you jittery and *more* stressed.
* **Barricade** the door and the windows (`B`). In the final collapse, weak
  barricades get broken down. Strong ones might just get you to dawn.
* When someone **knocks**, look through the peephole and choose. Every choice
  has a cost.

If your **stress** meter fills completely, you break. Survive the whole night
and dawn arrives.

---

## Endings

There are **six** ways the night can end:

* **DAWN** — you simply survive until first light.
* **EXTRACTED** — you correctly trust a real evacuation team.
* **PROCESSED** — you open the door to soldiers under the extermination order.
* **TURNED** — you let something infected inside your walls.
* **THE LONGEST NIGHT** — your stress meter maxes out and your mind gives way.
* **BREACHED** — the finale arrives and your barricades weren't enough.

Your choices, your barricades, and how well you managed your nerves decide
which one you get.

---

## Project structure

```
game/
  index.html            the page + all on-screen UI
  README.md             this file
  LICENSE               MIT
  styles/
    main.css            all UI styling / CRT + glitch effects
  scripts/
    engine.js           game state, loop, schedulers, endings, input
    renderer.js         all <canvas> drawing + animated street/sky/FX
    player.js           the homeowner: movement, stress, fatigue
    events.js           story content, door visitors, horror events
    ui.js               DOM view layer (HUD, screens, modals, toasts)
    audio.js            Web Audio synthesis + WAV sound effects
  assets/
    sprites/            pixel-art PNGs (player, house, tv, computer,
                        window, door, helicopter, soldier)
    audio/              WAV effects (tv static, knock, helicopter,
                        alert, ambience)
```

The scripts are modular and load in dependency order, sharing a single
`window.ZH` namespace so the game runs even when opened directly from the file
system (no ES-module CORS issues).

---

## Accessibility & content note

Contains flashing lights, sudden loud sounds, and unsettling themes
(violence, death, body horror) rendered in a stylized pixel-art form. There is
no gore beyond a few dark pixels. You can mute at any time with `M`.

---

## License

Released under the **MIT License** — see [`LICENSE`](LICENSE).
