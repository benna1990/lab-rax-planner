# Contributing

Thanks for helping make the Mini Rack Planner better. Most contributions add a device mount, a panel or a frame mod to `catalog.json`. You don't need to touch any code for that.

## Where things go in `catalog.json`

| Section | For | Shown in |
|---|---|---|
| `devices` | Mounts for a specific device, and top mounts (`"position": "top"`) | Devices and Top mounts tabs |
| `panels` | Panels and accessories that aren't tied to one device: vents, fans, keystone, shelves, power, displays | Panels tab |
| `extras` | Frame mods that take no rack units: sizes, depth, handles, feet, side panels, drawers, lighting | Frame & extras tab |
| `hardware` | Things people buy: screws, inserts, fans | Shopping list |

## Adding a device mount

Find the device's group under `devices`, then add a mount to the device, or add the device:

```json
{ "device": "USW-Lite-8-PoE", "size": [163.7, 31.7, 99.6], "color": "#E9EBEC", "io": ["rj45x8"], "mounts": [
  { "id": "mw2117690", "label": "1U mount · Lab Rax", "u": 1, "watts": 8, "face": "switch",
    "shape": { "row": [{ "dev": true }], "shelf": true },
    "author": "Hawkish", "labrax": true, "url": "https://makerworld.com/models/2117690" }
] }
```

A new device needs `size`, `color` and `io` (see [How parts look](#how-parts-look)).

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, lowercase letters and digits. Use `mw` or `pr` plus the model number. Saved layouts refer to it, so never rename one. |
| `label` | yes | What the mount is, in a few words: "1U mount with keystones". Add "· Lab Rax" when it was made for Lab Rax. |
| `u` | yes, unless `position` is `top` | Height in rack units: 0.5 to 10 in steps of 0.5. |
| `estimated` | no | `true` when the model page doesn't state the height. Shown as ≈. Remove it once someone has checked. |
| `face` | no | The kind of part: `shelf` (default), `switch`, `vent`, `fan`, `ks` (keystone), `sbc`, `drv2`, `drv4`, `d`, `blank`. The cooling estimate uses it, and a part without a `shape` is drawn from it. |
| `shape` | no | What the part looks like: see [How parts look](#how-parts-look). |
| `author` | no | The maker's name. |
| `evidence` | no | How each claim is known: `{"height": {"state": "verified", "method": "measured from the model file", "date": "2026-10-15"}}`. Claims: `height`, `fit`, `power`, `depth`. States: `verified` (needs a method and a date), `documented` (the creator or maker says so; needs a `source` link, or the entry's own `url`), `community` (a builder reports it; needs a `source`), `estimated`, `unknown`. Without it, only `estimated`, `labrax` and `wattsEstimated` count as evidence; any other height or power figure shows as Unknown. Never mark something verified because a listing is popular. See `docs/audit/CATALOG_VERIFICATION.md`. |
| `license` | new entries | The model's licence as its page states it, e.g. `CC BY-NC-SA 4.0`. Required for every entry that isn't in `tools/catalog-baseline.json` (the catalog as it was on 15 October 2026); the validator checks it. Copy it from the page; don't guess. |
| `labrax` | no | `true` when the page says it was made for or tested in Lab Rax. |
| `fit` | no | `"labrax"` when the panel has the Lab Rax size instead of the EIA one: n × 44.45 − 2.45 mm high (42 for 1U), three 10 × 7 mm slots per U, and ½U panels 22.6 mm that turn over to fit the upper half of a U. Set on mklements' own Lab Rax parts; on another maker's part only when `tools/measure.mjs` says its panel is "like the Lab Rax panels". Without it the part is drawn at the EIA size, n × 44.45 − 0.79. |
| `url` | yes | The original model page on MakerWorld or Printables. Never a mirror or re-upload. |
| `position` | no | `top` for parts that replace the top panel. |
| `hardware` | no | Extra parts to buy: `[{ "part": "fan80", "qty": 2 }]`. |
| `note` | no | One sentence the builder should know. |
| `depth` | no | Shelf depth in mm, only when it differs from the device's `size`. |
| `watts` | yes | Typical heat the device gives off in W, used by the cooling estimate. See [Watts](#watts) below. |
| `wattsEstimated` | no | `true` when `watts` is a guess rather than a spec or a measurement. Shown as ≈. |
| `fanDir` | no | For parts with fans in `hardware`: which way they blow by default, `intake` or `exhaust`, or `cross` for a pair: one in and one out, in the two side panels or in the bottom and top panel. Builders can turn each part around. |
| `vent` | no | For openings: the open share of the panel, 0 to 1. A hex mesh top is about `0.5`, a vent panel `0.4`. |
| `poe`, `poeIn`, `poeOptional`, `ports`, `eth` | no | Power and network, for the power budget: see [Power and network](#power-and-network). Usually set on the device; a mount only sets them when it differs. |

Panels use `id`, `name`, `u`, `face`, `shape`, `url`, `author`, `labrax`, `fit`, `estimated`, `hardware`, `watts`, `wattsEstimated`, `fanDir`, `vent` and the power fields; `watts` only when the panel makes heat (power supplies, chargers, displays). Extras use `id`, `name`, `label`, `shape`, `author`, `url`, `hardware`, `fanDir` and `vent`, plus `at`: where the extra lets air through, `side`, `back` or `top` (`top` also covers a matching bottom panel; `fanAt` when its fans sit elsewhere). For example a pair of side panels with an 80 mm fan each:

```json
{ "id": "mw1460771", "name": "Side panels with an 80 mm fan", "url": "https://makerworld.com/models/1460771",
  "hardware": [{ "part": "fan80", "qty": 2 }], "fanDir": "cross", "at": "side" }
```

### Watts

- Use the typical draw of a home lab under light load, not the maximum and not the power supply's rating.
- Switches: their own draw, never the PoE budget. The power a switch sends out heats the devices it feeds.
- When the maker only gives a maximum (often "excluding PoE output"), use about two thirds of it. Measured figures (ServeTheHome, wall-meter tests) beat both.
- PCs: idle to light load, e.g. 12 W for a Lenovo Tiny or HP EliteDesk Mini, 7 W for a Mac mini M4.
- Drives: about 6 W per 3.5″ hard drive and 2 W per 2.5″ drive. Add up everything a mount holds.
- Power supplies and chargers: only what they lose as heat, a few watts.
- Add `"wattsEstimated": true` when you had to guess, for example when a mount fits several devices or a different number of boards.

### Power and network

The Power & network section adds up what the rack draws (the same `watts`), checks the PoE budget and PoE ports, counts network ports and estimates UPS runtime. Five optional fields feed it, all from the maker's spec sheet:

```json
{ "device": "USW-Lite-8-PoE", "size": [163.7, 31.7, 99.6], "color": "#E9EBEC", "io": ["rj45x8"],
  "poe": {"budget": 52, "ports": 4, "std": "at"}, "mounts": [ … ] }
{ "device": "U7 Pro", "size": [206, 46, 206], "color": "#F4F5F6", "io": ["led"], "poeIn": 21, "mounts": [ … ] }
```

| Field | Meaning |
|---|---|
| `poe` | PoE it gives: `budget`, the total PoE budget in W; `ports`, how many ports give PoE; `std`, the standard of those ports: `af` (PoE, 15.4 W per port), `at` (PoE+, 30 W, the default) or `bt` (PoE++, 60 W). When the budget depends on the power supply, use the one with the adapter it comes with, or with the best PoE input when it has no adapter. Builders can enter their own budget. An injector is `"poe": {"budget": 30, "ports": 1}`. |
| `poeIn` | The most the device draws over PoE in W, from the spec sheet (not the typical `watts`), so the budget also holds at full load. At most 51 W. The planner works out the standard it needs: up to 12.95 W PoE, up to 25.5 W PoE+, more PoE++. |
| `poeOptional` | `true` when PoE is not the usual way to power it: it needs a PoE HAT or splitter, or it comes with its own power supply. It then counts on PoE only when the builder switches it on. Set `false` on a mount made for the PoE version (a Pi tray for a PoE HAT). |
| `ports` | Network ports it offers to other devices: on a switch all RJ45 and SFP ports, on a router or gateway its LAN ports without the WAN port, `0` for an injector. Devices in the switch and gateway groups without `ports` count the `rj45` and `sfp` in their `io`, so set it when the ports are at the back or one of them is the WAN port. |
| `eth` | Switch ports it takes. Devices take 1 each by default, panels 0. Use `0` for things that don't plug into a switch: drives, USB enclosures, power supplies, a modem that feeds the router's WAN port. |

On a device these count per device; a mount that holds several (`"n": 2`, or 7 Pi boards) multiplies them. A mount's own `ports` and `eth` count for the whole mount, for mixed mounts like a Pi beside a small switch. `poe` and `poeIn` on a mount replace the device's, per device it holds.

### Fans

Fans are entries in `hardware` with their size, rated flow and maximum static pressure, at full speed in free air: `"fan80": { "name": "80 mm fan", "mm": 80, "cfm": 30, "pa": 23 }`. The values are typical for good case fans (Noctua, Arctic); a part refers to them by `part` and `qty`.

### How parts look

The library drawing, the front view and the 3D model of every part are drawn by `shapes.js` from the catalog, never from the model files. Run a local server and open `tools/looks.html` to see them all; `tools/looks.html?ids=mw2117690&3d=1` shows one part, also in 3D.

**Devices** carry the size and the face that shows at the front of the rack, from the maker's spec sheet:

| Field | Meaning |
|---|---|
| `size` | `[width, height, depth]` in mm as the device sits in its mounts; width is across the side that faces out. |
| `color` | Body colour, like `"#E9EBEC"`. |
| `io` | What is on that side, left to right; `xN` repeats one: `rj45x8`. Tokens: `rj45`, `sfp`, `usba`, `usba3`, `usbc`, `hdmi`, `mhdmi`, `dp`, `phone`, `coax`, `antenna`, `audio`, `power`, `btn`, `led`, `ledw`, `ledb`, `lcd` (`lcd@24x12` sets its size in mm), `oled`, `sd`, `fan`, `vent`, `grille`, `iec`, `rocker`, `handle`, `terminal`, `vbay` (a NAS drive tray), `bay35`, `bay25`, `logo`, `gap`, and `space`, which pushes what follows to the right. Ten or more ports stack in two rows when the face is tall enough. |

**Mounts and panels** have a `shape`: the pieces across the panel, left to right, and what is behind it.

```json
"shape": { "row": [{ "ks": 1 }, { "dev": true }, { "ks": 1 }], "shelf": true }
```

| Piece | Draws |
|---|---|
| `{ "dev": true }` | The mount's device behind a window. `"dev": "JetKVM"` uses another catalog device; `n` repeats it, `"rot": 90` stands it on its side, `"win"` is `full` (default), `ports` or `frame`. |
| `{ "sbc": 7, "board": "pi5", "orient": "v", "tray": true }` | Single-board computers with their ports to the front: `pi5`, `pi4`, `pi3`, `zero`, `opiz3`, `rock5b`, `uno`. `"orient": "v"` stands them up (2U and more), `"tray"` adds a printed blade per board. |
| `{ "ks": 12, "rows": 1 }` | Keystone jacks; `"jack": "white"` for white ones. |
| `{ "bay": 3.5, "n": 2 }` | Drive sleds with handles, 3.5 or 2.5″; `rows`, `"orient": "v"` for upright bays, `w` and `h` in mm. |
| `{ "fan": 80, "n": 2 }` | Fans behind round openings; `"grille": "hex"` or `"wire"`. |
| `{ "vent": "hex" }` | A vent: `hex`, `slots`, `round`, `perf`, `grid`, `diamond`, `y` or `crown`. It fills the free width unless `w` is set. |
| `{ "screen": 7, "ratio": 1.667 }` | A display, diagonal in inches (or `w` and `h` in mm); `n` for several. |
| `{ "out": 4, "type": "schuko" }` | Sockets: `schuko`, `us`, `uk`, `ch`, `au`, `iec`, `usbc`, `usba`. |
| `open`, `slot`, `brush`, `drawer`, `comb`, `ring`, `hook` | An open shelf front, a cable slot, a brush strip, drawers, a cable comb, D-rings, hooks. |
| `inlet`, `rocker`, `btn`, `knob`, `oled`, `usb`, `dtype`, `matrix`, `pcie`, `text`, `gap`, `col` | A mains inlet (`"fuse": true`), switches, a push button, a knob, a small display, USB ports, Neutrik D-type holes, an LED matrix, a PCIe bracket, text, a spacer, and a column of pieces. |

Around the row: `"shelf": true` adds a shelf behind it (`"floor": "hex"` or `"slots"`), `"depth"` sets the shelf depth, `"plate": "hex"` perforates what the pieces leave free, and `"rows": [[…], […]]` stacks rows.

**Top mounts** (`"position": "top"`): `{ "ap": "U7 Pro", "tilt": 45 }` for an access point (`U7 Pro`, `U7 Pro Max`, `U7 Pro XG`, `U6+`, `U6 Pro`, `U6 Lite`, `U7 Lite`), `{ "plate": "hex", "fan": 120 }` for a mesh or fan top (`"n"` fans), `{ "plate": "gridfinity" }`.

**Extras** say what they change on the frame: `{ "side": "hex" }` (or `kumiko`, `skadis`, `multiboard`, `honeycomb`, `brick`, `vent`, `grid`) and `{ "fan": 80 }` for side panels, `{ "handles": "stackable" }` (`side`, `long`), `{ "feet": "big" }` or `"casters"`, `{ "drawer": true }`, `{ "logo": "neopixel" }` or `"hexbar"`, `{ "corner": 11 }` for keystones in the top corner (`"matrix"` for an LED matrix), `{ "depth": 50 }` for deeper sides, `{ "edge": "switch" }`, `{ "wall": true }` for a wall cleat behind, and for the card only `"u"`, `"frame"` (`lowprofile`, `matx`), `"inside"` (`comb`, `guide`, `atx`, `matx`, `fans`, `bracket`, `device`, `keystone`) and `"hl"` to highlight the `posts`, `handles`, `base` or `top`.

`node tools/validate.mjs` checks shapes, sizes, `io` tokens and the power fields (a PoE switch can't have more PoE ports than ports).

If you have the model file, put it in `reference/` named by the entry's id (`reference/keystone.3mf`) and run `node tools/measure.mjs keystone`. It reports the height in U, the screw holes, the openings through the front plate, the depth and, for top mounts, the tilt, and compares them with the catalog entry and its drawing (a text map shows openings that are only in the model or only in the drawing). `reference/` is ignored by git: never commit model files or outlines traced from them.

Run `node tools/validate.mjs`, then open a pull request.

## Custom part types

The parametric parts live in `parts.js` under `BUILDERS`. A new builder gets `(THREE, params)` and returns `{ geoms, size, note }` in millimetres, with the front face at z = 0 and the part extending to −z; add `u` when the part sets its own height (a shelf for a tall device, a fan panel from its fan size) and `show` for geometry only the 3D view draws (the fans behind a fan panel). Use `plateShape()` so the screw holes follow the 10″ hole pattern. In `app.js`, add the type to `GEN_NAMES`, `genLabel()`, `cleanParams()` (shared links are checked there), `mkParams()`, `mkOptions()` and, when it only comes in some heights, `mkHeights()`; add it to the select in `index.html`; draw it in `genShape()` in `shapes.js` and check it in `tools/looks.html?ids=gen`. A part that holds fans lists them in `genHardware()`, so the cooling estimate and the shopping list count them.

## Code

Plain HTML, CSS and JavaScript, no build step and no framework. Test at phone width and in both themes before opening a pull request.

## Licences

Don't add model files to this repository. Each model keeps the licence its author chose; most MakerWorld models may not be redistributed.
