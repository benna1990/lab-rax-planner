# Contributing

Thanks for helping make the Lab Rax Planner better. Most contributions add a device mount, a panel or a frame mod to `catalog.json`. You don't need to touch any code for that.

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
{ "device": "USW-Lite-8-PoE", "mounts": [
  { "id": "mw2117690", "label": "1U mount · Lab Rax", "u": 1, "face": "switch",
    "author": "Hawkish", "labrax": true, "url": "https://makerworld.com/models/2117690" }
] }
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, lowercase letters and digits. Use `mw` or `pr` plus the model number. Saved layouts refer to it, so never rename one. |
| `label` | yes | What the mount is, in a few words: "1U mount with keystones". Add "· Lab Rax" when it was made for Lab Rax. |
| `u` | yes, unless `position` is `top` | Height in rack units: 0.5 to 10 in steps of 0.5. |
| `estimated` | no | `true` when the model page doesn't state the height. Shown as ≈. Remove it once someone has checked. |
| `face` | no | How the front is drawn: `shelf` (default), `switch`, `vent`, `fan`, `ks` (keystone), `sbc`, `drv2`, `drv4`, `blank`. |
| `author` | no | The maker's name. |
| `labrax` | no | `true` when the page says it was made for or tested in Lab Rax. |
| `url` | yes | The original model page on MakerWorld or Printables. Never a mirror or re-upload. |
| `position` | no | `top` for parts that replace the top panel. |
| `hardware` | no | Extra parts to buy: `[{ "part": "fan80", "qty": 2 }]`. |
| `note` | no | One sentence the builder should know. |
| `depth` | no | Device depth in mm, used by the 3D view. |
| `watts` | yes | Typical heat the device gives off in W, used by the cooling estimate. See [Watts](#watts) below. |
| `wattsEstimated` | no | `true` when `watts` is a guess rather than a spec or a measurement. Shown as ≈. |
| `fanDir` | no | For parts with fans in `hardware`: which way they blow by default, `intake` or `exhaust`, or `cross` for a pair: one in and one out, in the two side panels or in the bottom and top panel. Builders can turn each part around. |
| `vent` | no | For openings: the open share of the panel, 0 to 1. A hex mesh top is about `0.5`, a vent panel `0.4`. |

Panels use `id`, `name`, `u`, `face`, `url`, `author`, `labrax`, `estimated`, `hardware`, `watts`, `wattsEstimated`, `fanDir` and `vent`; `watts` only when the panel makes heat (power supplies, chargers, displays). Extras use `id`, `name`, `label`, `author`, `url`, `hardware`, `fanDir` and `vent`, plus `at`: where the extra lets air through, `side`, `back` or `top` (`top` also covers a matching bottom panel; `fanAt` when its fans sit elsewhere). For example a pair of side panels with an 80 mm fan each:

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

### Fans

Fans are entries in `hardware` with their size, rated flow and maximum static pressure, at full speed in free air: `"fan80": { "name": "80 mm fan", "mm": 80, "cfm": 30, "pa": 23 }`. The values are typical for good case fans (Noctua, Arctic); a part refers to them by `part` and `qty`.

Run `node tools/validate.mjs`, then open a pull request.

## Custom part types

The parametric parts live in `parts.js` under `BUILDERS`. A new builder gets `(THREE, params)` and returns `{ geoms, size, note }` in millimetres, with the front face at z = 0 and the part extending to −z. Use `plateShape()` so the screw holes follow the 10″ hole pattern, and add the type to the select in `index.html` and to `mkOptions()` in `app.js`.

## Code

Plain HTML, CSS and JavaScript, no build step and no framework. Test at phone width and in both themes before opening a pull request.

## Licences

Don't add model files to this repository. Each model keeps the licence its author chose; most MakerWorld models may not be redistributed.
