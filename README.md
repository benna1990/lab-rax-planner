# Mini Rack Planner

**Plan your 3D-printed 10″ rack · Lab Rax and more.** Plan a [Lab Rax](https://the-diy-life.com/introducing-lab-rax-a-3d-printable-modular-10-rack-system/) or another 3D-printed 10″ homelab rack before you print it. (Formerly the Lab Rax Planner; it is an independent planner, not an official Lab Rax tool.)

**Open the planner: https://benna1990.github.io/lab-rax-planner/**

- **Pick from ~500 community parts**: device mounts (UniFi, TP-Link, MikroTik, Netgear, Zyxel, mini PCs, thin clients, firewall boxes, Mac mini, Raspberry Pi, Mini-ITX, NAS and drive bays…), panels (power, keystone and D-type patch panels, fans, shelves), top mounts and frame mods, each linked to its model page.
- **Lay it out** at real scale. Whole-U panels snap to the hole pattern; ½U panels fit either half of a U.
- **Look around in 3D**, and load your own downloaded STL or 3MF files onto a part to see them in place. Those files never leave your browser.
- **Check the cooling**: every part has its typical heat in watts and every fan its rated flow. The planner estimates the air temperature at each height and the airflow through the rack, shows where air comes in and goes out, and suggests fans, a mesh top, an open back or other changes with their effect (hottest air before → after). You can turn each fan around and enter a part's real watts. See [Cooling estimate](#cooling-estimate).
- **Make custom parts**: blank, vent (slots or hexagons), keystone and label panels, and a shelf sized to your device. They export as STL, ready to print without supports: panels and shelves face-down, label plates face-up.
- **Know what to buy and how to build it**: a shopping list made from your layout (filament per colour, screws and inserts in packs, fans with safe 5 V power, network, power supplies, acrylic, handy extras) with shop links, and a step-by-step build and wiring guide.
- **Download a build pack**: one ZIP with your custom STL files, a PDF build plan, a build guide page with the shopping list, a download list to click through the community models, a print list and a shopping list (CSV).
- Light and dark theme. Your layout is saved in your browser; share it with a link (Share link in Your build).

It is a static site with no build step: `index.html`, `app.js`, `parts.js`, `view3d.js`, `pdf.js`, `airflow.js` and `catalog.json`. three.js r128 and jsPDF 2.5.1 load from cdnjs/jsDelivr when the 3D view or PDF export is first used.

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

## Cooling estimate

`airflow.js` estimates how warm the air in the rack gets. It is a quick physical model, not CFD, so treat the numbers as a guide.

- **Heat.** Each part's `watts` in `catalog.json` is its typical draw in a home lab under light load, from spec sheets and wall-meter measurements. A switch counts its own draw, not its PoE budget, and a power supply only its losses. ≈ marks an estimate. A part's own value always wins.
- **Layers.** The rack is split into ½U layers, each with one air temperature. Air that comes in through an opening is at room temperature (25 °C unless you change it).
- **Stack effect.** Warm air is lighter, so the pressure inside rises faster with height than outside. Low openings take air in, high ones let it out. An open back does both, split at the neutral plane (the dashed line in the Airflow view). Openings follow orifice flow with a discharge coefficient of 0.6, and the seams between panels leak a little.
- **Fans.** Each fan follows a straight fan curve from its rated flow and maximum static pressure, at full speed, minus 15 % for the grille. It pushes against whatever pressure the openings leave. Typical figures: 40 mm 6 CFM, 80 mm 30, 92 mm 40, 120 mm 52, 140 mm 75, 200 mm 86 CFM (1 CFM = 1.7 m³/h).
- **Heat balance.** In every layer the parts' heat is carried off by the air flowing through it. Warm air under cooler air turns over and mixes upward, warm air above cooler air stays put, and about 4 W per m² per °C leaks through the printed walls. Pressure and temperature depend on each other, so the model solves them in turn until they settle.
- **Not included.** The devices' own fans (which usually help), draughts and air conditioning in the room, sunlight, and how hot a device runs inside. The temperatures are of the air around the parts. Most network gear and mini PCs are rated for air up to 40 °C, so the planner calls a rack cool up to 35 °C, warm up to 40 °C and hot above that.

## Add a device, mount or part

Edit **`catalog.json`** and see [CONTRIBUTING.md](CONTRIBUTING.md) for the format. Run `node tools/validate.mjs` before opening a pull request; GitHub runs it on every pull request.

## Shop and affiliate links

Every item on the shopping list links to a search at each shop in `catalog.json` → `shops` (Amazon, bol and AliExpress to start with; `{q}` is the search text). To earn from the links:

- **Amazon**: put your Associates tag in `shops.amazon.tag` (e.g. `yourname-21` for amazon.nl).
- **Other shops**: put the deep-link template from their partner programme in `wrap`, with `{url}` where the product link goes.

When any tag or template is set, the planner and the build guide show an affiliate disclosure (and Amazon's own sentence when the Amazon tag is set). Hardware lives in `catalog.json` → `hardware`, with a spec, pack size, shop search text and, for fans, a quiet and a budget model. Handy extras and build tips come from `tips.json`.

## Credits and licenses

- Lab Rax is designed by [Michael Klements](https://the-diy-life.com/) and published on [MakerWorld](https://makerworld.com/en/models/1294480).
- Every model in the catalog belongs to its maker and keeps its own license (most use the MakerWorld licence, which does not allow redistribution). This project only links to them and never stores or redistributes their files.
- Custom parts are original designs generated from the open 10″ rack standard.
- The planner is released under the [MIT License](LICENSE).
