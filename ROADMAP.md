# Roadmap

Status on 15 October 2026 and what comes next. Written so a new session (for example in Claude Code) can pick it up.

## Done

- Planner UI: parts library (devices, panels, top mounts, frame & extras, custom), front view at real scale, light/dark theme, share link.
- Catalog of ~440 community parts with links, authors and heights (≈ when estimated). About 150 were added on 15 October 2026 from a MakerWorld search sweep.
- Whole-U panels snap to the EIA hole pattern; ½U panels fit either half.
- 3D view (three.js r128) with side panels toggle, selection, and loading your own STL/3MF onto a part. The frame is modelled after the photos of the real Lab Rax (bevelled rings, arched handles, brass inserts).
- Custom part generator with STL export: blank, vent (slots/hex), keystone (1–12 ports, 1–2 rows), label plate, shelf sized to a device.
- Build pack ZIP: custom STLs, PDF build plan, print list and shopping list (CSV), README.
- Shopping list with Amazon search links and an affiliate tag setting.
- Public repo at https://github.com/benna1990/lab-rax-planner, live on GitHub Pages at https://benna1990.github.io/lab-rax-planner/, with the catalog validator as a GitHub Action.

## Next

1. **Measure the original frame.** Download the Lab Rax 3MF from MakerWorld into `reference/` (git ignores it) and measure ring width and height, bevels, post section, handle and feet. Update `FRAME` in `view3d.js` and the table in `README.md`.
2. **Check estimated heights (≈).** 182 of 369 mounts and panels have `"estimated": true`. Open each model page and set the real height; most of the sweep entries came from search results only.
3. **Test-print the custom parts.** One ½U keystone panel and one 1U vent panel; adjust `KS_W`, `KS_H`, `HOLE_D` and `PANEL_W` in `parts.js` if needed.
4. **More custom parts.** Fan panel (40/80/120 mm), D-type/XLR panel, Pi tray, cable pass-through.
5. **Depth per device.** Add `depth` to common mounts so the 3D view shows real devices behind the panels.
6. **Rear view and cabling** in 3D.
7. **Catalog gaps.** The October sweep found RB5009, Cloud Key Gen2+, UNVR Instant and HDHomeRun (with a Pi 5). Still none for UDR/UDR7 or mini UPS units (Printables 1208746 fits an APC Back-UPS 650, height unknown); the USW Pro Max is 281 mm wide and doesn't fit. The sweep hit its search limit before PDUs, fibre and RJ45 patch panels, Deco, Starlink, Flint 2 and thin clients (Wyse, Futro). Open leads without an id: a Lab Rax U7 Pro mount remix, a PWM fan-controller top panel, longer bolt-together sides by obibi, 1U drawers and mklements' D-type patch panel.
