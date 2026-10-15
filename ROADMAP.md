# Roadmap

Status on 15 October 2026 and what comes next. Written so a new session (for example in Claude Code) can pick it up.

## Done

- Planner UI: parts library (devices, panels, top mounts, frame & extras, custom), front view at real scale, light/dark theme, share link.
- Catalog of ~500 community parts with links, authors and heights (≈ when estimated). About 150 were added on 15 October 2026 from a MakerWorld search sweep, and 64 more from a second sweep the same day (power, patch panels, thin clients, firewall boxes).
- Whole-U panels snap to the EIA hole pattern; ½U panels fit either half.
- 3D view (three.js r128) with side panels toggle, selection, and loading your own STL/3MF onto a part. The frame is modelled after the photos of the real Lab Rax (bevelled rings, arched handles, brass inserts).
- Custom part generator with STL export: blank, vent (slots/hex), keystone (1–12 ports, 1–2 rows), label plate, shelf sized to a device.
- Build pack ZIP: custom STLs, PDF build plan, print list and shopping list (CSV), README.
- Shopping list with Amazon search links and an affiliate tag setting.
- Airflow estimate: heat per part (rule of thumb, catalog `watts` or the user's value), stack and fan flow, air temperature rise, recommendations with their expected effect, and an Airflow view. Hover tooltips replace text on the panels; the build pack has a download list.
- Every part looks like its model in the library, the front view and the 3D view (`shapes.js`): a `shape` per catalog entry (Pi blades, keystones, drive sleds, fans, vents, sockets, screens, device windows), real sizes and front I/O for all 142 devices from the makers' spec sheets (28 estimated), access points and fan or mesh tops, and extras that show on the frame (patterned or fan side panels, handles, feet, casters, drawer, lit logo, corner keystones, deeper sides). Hovering a library row shows a larger drawing with the device's size. `tools/looks.html` shows every part.
- Public repo at https://github.com/benna1990/lab-rax-planner, live on GitHub Pages at https://benna1990.github.io/lab-rax-planner/, with the catalog validator as a GitHub Action.

## Next

1. **Measure the original frame.** Download the Lab Rax 3MF from MakerWorld into `reference/` (git ignores it) and measure ring width and height, bevels, post section, handle and feet. Update `FRAME` in `view3d.js` and the table in `README.md`.
2. **Check estimated heights (≈).** 218 of 430 mounts and panels have `"estimated": true`. Open each model page and set the real height; most of the sweep entries came from search results only. From the second sweep, check these first: 2261662 (Wyse 5070; the page also mentions a 19″ rack), 442928 (½U keystone panel with a 30 mm plate, may need 1U), and 1427297, 1845503 and 1994910 (numbers seen only on the 3dgo.app mirror).
3. **Test-print the custom parts.** One ½U keystone panel and one 1U vent panel; adjust `KS_W`, `KS_H`, `HOLE_D` and `PANEL_W` in `parts.js` if needed.
4. **More custom parts.** Fan panel (40/80/120 mm), D-type/XLR panel, Pi tray, cable pass-through.
5. **Check the looks against the models.** sbc7, the mklements panels, the UCG-Max, USW-Lite-8-PoE, Lenovo Tiny, Mac mini and the U7 Pro mounts were checked against their photos; the other shapes follow from the labels. Open `tools/looks.html`, compare with each model page and tune its `shape` (keystones left or right, window style, number of units). Better: download the model into `reference/` as `<id>.3mf` or `.stl` and run `node tools/measure.mjs <id>`; it reports the height, screw holes, openings, depth and tilt and how much of the drawn openings match. Ten devices are wider than the 222 mm opening (Cisco 2960-C 269 mm, FRITZ!Box 7590 250, Zyxel GS1900-8 250, MG-108 240, EdgeRouter 4 229, RB4011 228, ER707-M2 226, FRITZ!Box 7362 SL and 7560 226); their mounts hold them some other way, so check how. Device sizes now set the depth in 3D; mount `depth` is only needed when a shelf differs.
6. **Rear view and cabling** in 3D.
7. **Catalog gaps.** The first October sweep found RB5009, Cloud Key Gen2+, UNVR Instant and HDHomeRun (with a Pi 5). The second sweep added 64 parts: PDUs and power strips, keystone, fibre and Neutrik D-type patch panels, shelf drawers, IKEA Dirigera, Starlink Gen 2, thin clients (Wyse 3040/5070, HP t620/t630/t640, Futro S740), firewall boxes (Topton/CWWK, Qotom, Protectli VP2420, Firewalla Gold) and obibi's bolted +50 mm sides (2350077). Still none for UDR/UDR7, mini UPS units (Printables 1208746 fits an APC Back-UPS 650, height unknown), TP-Link Deco, Starlink Gen 3/Mini, GL.iNet Flint 2, Netgate, Futro S920/S940 or HP t730/t740; the USW Pro Max is 281 mm wide and doesn't fit. The "Lab Rax U7 Pro mount remix" lead is Loonie Merker's 3217818, already listed. Open leads seen by title but without an id: matataa's "Lab Rax PWN controller top panel with 120mm fan", zaqu's "Neutrik D Series and Keystone 10-inch Panel" (a remix of 825894), Janjd's "Labrax 10" Rack mount for HP ThinClient (t620Plus)", and 1U drawers by Patrick and by usefulhobbies. No D-type panel by mklements turned up.
8. **Real heat figures.** Add `watts` to common devices in `catalog.json` (gateways, PoE switches, mini PCs, NAS) so the airflow estimate uses measured values instead of rules of thumb, and check the estimate against a thermometer in a real rack.
