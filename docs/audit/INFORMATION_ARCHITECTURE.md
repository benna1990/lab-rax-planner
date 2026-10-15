# Information architecture — proposal

Goal: someone without homelab experience goes from an empty rack to a compatible, safe and buildable system. Experienced builders work just as fast as today.

## Principles

- **One product, three roles:** a *planner* (choose and place), a *build assistant* (what to print, buy, assemble and connect, and whether it's ready) and *knowledge* (what each thing is, what's trustworthy, how it works).
- **Guidance, not a cage:** the steps orient you; every step stays reachable at any time, and nothing forces a linear path.
- **Context decides what you see:** fan guidance appears when there's a fan, PoE guidance when there's PoE, lighting when there's a lit logo.
- **Evidence before polish:** every number or compatibility claim shows its verification state.

## The route (non-linear steps)

| Step | Question it answers | What lives there (existing → place) |
|---|---|---|
| 1 Rack | Which rack, how tall, which printer, which country? | rack system and variant, height, heat-set or bolted, printer, country (now spread over the stepper, settings, print list and shopping list) |
| 2 Hardware | What goes in it, and where? | library: devices and their mounts, panels, custom parts; the Where bar for top, bottom and sides; the 3D and Flat views |
| 3 Connect | How does it get power, network and air? | power and PoE, network ports, UPS, fan directions; next: per-device supplies, fan and LED wiring cards |
| 4 Check | Is it ready to build, and what's missing? | **Build readiness** (new): placement, collisions, bed size, cooling, power, ports, unverified data |
| 5 Print & assemble | What do I print, and in what order do I build? | print list, frame parts, build guide |
| 6 Export | What do I take with me? | PDF, build pack, shopping list, share link, rack file |

On a wide screen the step bar sits above the build column; on a phone it's the main navigation and jumps to the area.

## Library taxonomy

| Section | What it holds | Today |
|---|---|---|
| **Rack systems** | base designs and their variants: Lab Rax 1–5U, bolted, LowProfile, mATX frame, extensions, other 10″ racks | mixed into `extras` ("Frame sizes & versions", parts of "Depth, width & joining") |
| **Devices** | the electronics themselves, with size, power and ports | device rows, with the mount as a subtitle |
| **Components** | what you print to hold or close something: mounts, shelves, panels, brackets, custom parts | mounts (per device), Panels, Custom |
| **Add-ons** | optional upgrades: lighting, cooling, cable management, feet, handles, displays | the rest of `extras`, top mounts |
| **Guides** | assembly, wiring, printing, cooling, troubleshooting | the build guide, tips, "How the estimate works" |
| **Resources** | outside tools and references: model sites, calculators, manufacturers | none yet |
| **My build** | your rack, its checks, connections, lists and exports | the "Your build" column |

**Hybrid placement:** *Devices*, *Components* and *Add-ons* stay in the library, filtered by the Where bar (front/back → devices and components; top, bottom and sides → add-ons and panels for that side). *Rack systems* moves to step 1. *Guides* show in context (inside the steps, and on a part when it's selected), with an index under Help. *Resources* goes under Help, not as a top-level tab.

**Wording:** a MakerWorld or Printables link is a *source* of a model, not a resource or a tool. A device row says what it is ("UniFi Cloud Gateway Max") and its printed holder says what it is ("1U mount by DToX").

## Status vocabulary (used everywhere)

- **Ready / Needs attention / To do / Unverified:** the readiness states.
- **Required / Recommended / Optional:** for parts and purchases.
- **Verified / Documented / Community reported / Estimated / Unknown:** for data, scoped to the claim (see `CATALOG_VERIFICATION.md`).

## What doesn't change

The look of the rack stays central. Every existing feature stays reachable (placement, undo, modular slots, part maker, airflow, power, PDF, ZIP, share links). Saved layouts and share links keep working.
