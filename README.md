# Lab Rax Planner

Plan your 3D-printed [Lab Rax](https://the-diy-life.com/introducing-lab-rax-a-3d-printable-modular-10-rack-system/) 10″ homelab rack before you print it.

**Open the planner: https://benna1990.github.io/lab-rax-planner/**

- **Pick from ~500 community parts**: device mounts (UniFi, TP-Link, MikroTik, Netgear, Zyxel, mini PCs, thin clients, firewall boxes, Mac mini, Raspberry Pi, Mini-ITX, NAS and drive bays…), panels (power, keystone and D-type patch panels, fans, shelves), top mounts and frame mods, each linked to its model page.
- **Lay it out** at real scale. Whole-U panels snap to the hole pattern; ½U panels fit either half of a U.
- **Look around in 3D**, and load your own downloaded STL or 3MF files onto a part to see them in place. Those files never leave your browser.
- **Make custom parts**: blank, vent (slots or hexagons), keystone and label panels, and a shelf sized to your device. They export as STL, ready to print without supports: panels and shelves face-down, label plates face-up.
- **Download a build pack**: one ZIP with your custom STL files, a PDF build plan, a print list with links and a shopping list.
- Light and dark theme. Your layout is saved in your browser; share it with a link (Share link in Your build).

It is a static site with no build step: `index.html`, `app.js`, `parts.js`, `view3d.js`, `pdf.js` and `catalog.json`. three.js r128 and jsPDF 2.5.1 load from cdnjs/jsDelivr when the 3D view or PDF export is first used.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk doesn't work, because the page loads `catalog.json` with `fetch`.

## Publish with GitHub Pages

Settings → Pages → Deploy from a branch → `main` / root.

## Dimensions

| What | Value | Source |
|---|---|---|
| Rack unit | 44.45 mm | 10″/19″ standard; Lab Rax article |
| Panel height | n × 44.45 − 0.79 mm (1U = 43.66 mm) | EIA-310 clearance |
| Hole pattern per U | 6.35 / 22.225 / 38.1 mm | EIA-310 |
| Hole spacing, centre to centre | 236.525 mm | Lab Rax article |
| Clear width between posts | 222 mm | Lab Rax article |
| Screws | M6 (×10 with inserts, ×12 bolted), inserts 8 mm OD, 4–5 mm, hole 5.5 mm deep | Lab Rax article, MakerWorld pages |
| Side edge pieces | 170 mm | “Lab Rax deeper sides” remix |
| Total depth | ≈ 240 mm | depth-spacer remix (beam = depth − 70 mm) |
| Top panel | ≈ 228 × 171.5 mm | U7 Pro top-mount page |
| Outer width | ≈ 280 mm | LowProfile remix (280 × 240 mm) |
| Printed panel width (custom parts) | 250 mm | chosen to fit a 256 mm bed and reach past the holes |
| Keystone cut-out | 14.9 × 16.4 mm in a 2 mm plate | module face 14.5 × 16.0 mm |

The 3D frame follows the photos in the Lab Rax article: bevelled top and bottom rings with mitred corners, the hex grille and logo on the front bevel, arched handles, posts with inserts and tinted side panels. Ring sizes, post section, handles and feet are estimates. They live in `FRAME` at the top of `view3d.js`; correct them there when you measure the original files (keep downloaded model files in `reference/`, which git ignores).

## Add a device, mount or part

Edit **`catalog.json`** and see [CONTRIBUTING.md](CONTRIBUTING.md) for the format. Run `node tools/validate.mjs` before opening a pull request; GitHub runs it on every pull request.

## Amazon links

The shopping list links each hardware item to an Amazon search. Put your Amazon Associates tag in `catalog.json` under `shops.amazon.en.tag`; the planner then shows the disclosure Amazon requires.

## Credits and licenses

- Lab Rax is designed by [Michael Klements](https://the-diy-life.com/) and published on [MakerWorld](https://makerworld.com/en/models/1294480).
- Every model in the catalog belongs to its maker and keeps its own license (most use the MakerWorld licence, which does not allow redistribution). This project only links to them and never stores or redistributes their files.
- Custom parts are original designs generated from the open 10″ rack standard.
- The planner is released under the [MIT License](LICENSE).
