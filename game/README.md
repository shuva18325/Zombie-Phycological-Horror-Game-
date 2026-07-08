# THE LONG NIGHT
### a 2D psychological-horror observation game

You are an ordinary homeowner, alone, across the **realistic day count** it
takes a zombie virus to break a country: a normal Day 1, a curfew by Day 3,
shelter-in-place by Day 5, martial law by Day 8, national collapse by Day 11.
There is **no fixed number of nights** — you survive day after day, managing
food and sleep and nerves, until a *real* way out finally knocks. You cannot
fight. You can only **watch** — through your TV, your computer, and your
windows — and decide, knock by knock, who you let past your door.

Before you start, you **choose where you live**: any of the 50 states (plus
Washington D.C., the NYC Fortress, and cut-off Long Island), each assigned to
a zone tier from the national situation map — **Green Safe Zone, Strained,
Frontline, Overrun, Collapsed East, or Gray Zone (Unrecoverable)** — and an
area — and the area decides your **home**: a studio apartment downtown, a
family house in the Suburbs, or a farmhouse alone in the fields (each with its
own interior and its own view outside the glass: skyline, a street of
neighbors' houses, or barn-and-windmill farmland — all of it deteriorating in
its own way as the outbreak advances). Every run starts on a perfectly normal
Day 1; your zone's *speed* decides how early the collapse reaches your street
— Gray Zones fall days ahead of the news, Green fortresses never fully fall.
In the Gray Zones there is no government left at all — militias reinforce
your door, gangs collect tolls for the district wall, and helicopter strike
waves burn the clusters a few blocks away.

Or leave America entirely: the **SLUM DISTRICTS — OVERSEAS** (Mumbai–Dharavi,
Dhaka–Korail, Manila–Tondo, Jakarta–Kampung) flip the whole formula. You share
one room with **four friends** — Ravi, Sana, Arjun and Meera — so stress stays
low, because nobody faces the night alone. The knocking never stops, and you
know every face: aunties with tiffins, the community watch with boards, Chotu
with the lane's news. There's barely any healthcare or internet — just a cheap
**2G phone** (group chat, battery **FM radio**, the **BMC ward map** of Greater
Mumbai with your ward marked ★ YOU) and a battered TV with its own reporter on
BHARAT 24x7. The Indian government arc runs janata curfew → Section 144 → army
cordon → the discovery: **the polluted water and air KILL the virus.** Dead
infected float down the Mithi river; only the trash-adapted **kachra walkers**
survive, rising from the heaps. Hold the lane to Day 16 and you win a unique
ending — **THE LANE HOLDS** — or leave with everyone at once when the lorries
come (**THE LANE LEAVES TOGETHER**).

Your four friends are **real characters**: they catch fevers (tend them
yourself, or send them to the aunty sick-room — with no clinic, every call is
a gamble), they can leave, and when something finally gets through the door,
one of them may **throw themselves between you and it**. Sitting with them on
the mat drains stress far faster than anything in America. **Chotu runs
side-quests** between houses — feed the runner and he brings back rations,
boards for your door, or the hand-printed **newspaper** that unlocks the news
app. One day mid-outbreak the **monsoon** breaks: the lane floods, and
everything sleeping in the heaps washes out and drowns. And everywhere, at any
window, press `E` to put your face to the glass — a full **first-person view**
of the street outside. Texting anyone, anywhere, gets **real answers**: every
contact reads what you type (love, fear, questions, food, the walkers) and
responds in character, warming up the more you talk to them.

The terror is a slow descent:

* The **news** opens on mild weather and cruise tourism, then breaks the story
  of a mystery illness aboard an Atlantic cruise ship — the **Peclip Virus**.
  Broadcast by broadcast the timeline escalates: hospitals overrun, quarantine
  zones, military relocation posts, cities falling, the **Eastern Coast
  Containment Wall**, a shoot-on-sight order, and four "Safe-Guarded Zones."
  Then comes the **Full National Peclip Report** — the last complete
  transmission: NYC the fortress city, the collapsed East, the Gray Zones
  declared unrecoverable, the walls, the helicopter strike waves, the gangs
  and militias holding the districts, the fortress-bases, and the final safe
  zones — before the anchor's voice breaks and the signal decays into static
  and dead air. You can replay every report you missed.
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
| Move around the apartment | `W A S D` or the **arrow keys** |
| Interact (TV, computer, window, kitchenette, bed, door) | `E`, `Space`, or `Enter` |
| Barricade (when next to the door or a window) | `B` |
| Cook breakfast (at the kitchenette) | `C` |
| Answer a knock | `Y` = open · `N` = keep shut |
| Close a screen | `Esc` |
| Mute / unmute | `M` or the 🔊 button |

Walk up to a fixture and a prompt tells you what you can do.

---

## What to do

* **Watch the TV** to follow the Peclip Virus broadcast timeline as it airs —
  complete with a detailed, animated news reporter whose composure decays with
  the country — and use **◀ EARLIER / LATER ▶** to replay reports you missed
  (the newest is marked **● LIVE**). The National Report segments show the
  live containment map right on screen.
* **Use the computer** — the main hub. A tile home screen opens six apps:
  **Messages** (friends text you as things fall apart, and you can type real
  replies), **Newspaper** (apocalypse editions from first rumor to the final
  photocopied Gray-Zone sheet), **National Map** (a live state-by-state
  outbreak map that darkens as events progress), **Virus Report** (CDC/FEMA
  sitreps), **Emergency Alerts**, and **Social** (a feed that slowly goes
  silent). Unread counts show on every tile.
* **Sleep in the bed** at night (or when exhausted) to skip to next morning —
  you wake to a changed world, fresh notifications, and sometimes new scratches
  on the outside of the door.
* **Look through the peephole** any time you're at the door. Usually the porch
  is empty. Usually.
* **Eat every day.** Your basket holds 8 meals; hunger stacks stress fast.
  Some visitors bring food. Some take it.
* **Cook breakfast** at the kitchenette (`C`): a finite supply of eggs,
  chicken, and toast that calms your nerves and burns off fatigue.
* **Peer through the windows** to see what's really happening outside.
* **Make coffee** with one press — instant, hot, grounding. It burns off
  fatigue and visibly sharpens the room while the caffeine lasts.
* **Barricade** the door and the windows (`B`). In the final collapse, weak
  barricades get broken down. Strong ones might just get you to dawn.
* When someone **knocks**, look through the peephole and choose. Every choice
  has a cost.

If your **stress** meter fills completely, you break. Survive all **three
days** — watching the world outside your windows slowly fill with trash,
abandoned cars, smoke plumes, fires and shambling silhouettes — and dawn
arrives.

---

## Endings

The game is open-ended: it goes on until you reach an ending. From **Day 12**
onward, real ways out start knocking. The endings:

* **EXTRACTED** *(good)* — you correctly trust a real evacuation team.
* **THE COMPOUND** *(good)* — in a Gray Zone, you go with the district militia.
* **PROCESSED** — you open the door to soldiers under the containment sweep.
* **TURNED** — you let something infected inside your walls.
* **THE LONGEST NIGHT** — stress (or hunger) maxes out and your mind gives way.
* **BREACHED** — your barricades weren't enough when the dark finally pushed.

How many days you lasted is your score. Your choices, your barricades, your
meals and your nerves decide how it ends.

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
    engine.js           game state, loop, day cycle, schedulers, endings
    renderer.js         all <canvas> drawing + deteriorating street/sky/FX
    world.js            the national zone map: states, tiers, areas, picker
    player.js           the homeowner: movement, stress, fatigue
    events.js           TV timeline, door visitors, horror events
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
