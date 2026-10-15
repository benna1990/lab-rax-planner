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
| `watts` | no | Typical heat the device gives off in W, used by the airflow estimate. Without it the planner guesses from the kind of device. |

Panels use `id`, `name`, `u`, `face`, `url`, `author`, `labrax`, `estimated`, `hardware` and `watts`. Extras use `id`, `name`, `label`, `author`, `url` and `hardware`, for example a side panel with an 80 mm fan: `"hardware": [{ "part": "fan80", "qty": 1 }]`.

Run `node tools/validate.mjs`, then open a pull request.

## Custom part types

The parametric parts live in `parts.js` under `BUILDERS`. A new builder gets `(THREE, params)` and returns `{ geoms, size, note }` in millimetres, with the front face at z = 0 and the part extending to −z. Use `plateShape()` so the screw holes follow the 10″ hole pattern, and add the type to the select in `index.html` and to `mkOptions()` in `app.js`.

## Code

Plain HTML, CSS and JavaScript, no build step and no framework. Test at phone width and in both themes before opening a pull request.

## Licences

Don't add model files to this repository. Each model keeps the licence its author chose; most MakerWorld models may not be redistributed.
