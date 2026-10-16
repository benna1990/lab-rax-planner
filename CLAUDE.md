# Mini Rack Planner (RackBuilder)

Static web app for planning 3D-printed 10" homelab racks: Lab Rax and more. Formerly "Lab Rax Planner": the localStorage keys (`labrax-planner-*`) keep their old names so saved layouts survive, and "Lab Rax" stays where it means the frame design. No build step, no framework. UI text is English.

## Files
- `tools/import-model-pages.mjs` — imports only page-confirmed model records into existing catalog entries, preserving unrelated JSON formatting. Use `--ids=id1,id2,...` for the exact reviewed batch: model-pages.json also contains unreviewed/new candidates, and unknown catalog IDs abort the import before writing. Profile choices are `opt` per mounted item and `optionChoices` for frame extras/top/bottom in version-1 rack files and share links. Drawings remain approximate unless `evidence.look` says a comparison was recorded.
- `rack.js` — single source for shared Lab Rax geometry: rack units, hole spacing, clear/panel widths, panel clearance, frame envelope and frame shape dimensions. Loaded before parts/shapes/3D; Node tools load it too. Values retain their existing documented/estimated status; centralizing does not verify fit. `catalog.frame` contains model/assembly records, not duplicated dimensions.
- `index.html` — markup and all CSS (light/dark tokens on `:root`, `data-theme` toggle).
- `app.js` — state, library, 2D front view, build column, build pack ZIP, part maker dialog. Saves to localStorage (`labrax-planner-v2`); Save as file / Open file and the build pack use `.rack.json` files, the share link's compact layout with `format` and `version`.
- `parts.js` — parametric custom parts (three.js geometry), binary STL writer, stored ZIP writer. 10" dimensions come from rack.js.
- `shapes.js` — how parts look: turns each catalog `shape` (and the device's `size`, `color`, `io`) into primitives in mm, drawn as SVG for the library and the front view and as three.js geometry for the 3D view. Also top mounts, frame extras (`frameMods`) and how each panel sits in its slot (`fit`: catalog `fit: "labrax"` parts are the measured Lab Rax size, n·44.45 − 2.45; the rest, custom parts included, EIA n·44.45 − 0.79).
- `view3d.js` — 3D view (three.js r128 from cdnjs, OrbitControls/STLLoader/3MFLoader from jsDelivr). `FRAME` aliases the shared rack.js frame dimensions.
- `pdf.js` — build plan PDF with jsPDF 2.5.1.
- `ready.js` — build readiness: the checks behind the step bar and the Build readiness panel (pure; `tools/test-ready.mjs`). Audit and plan: `docs/audit/`.
- `resources.json` — the Guides → Resources list (title, https url, kind, about; validated); only sources that were actually read.
- `layout.js` — placement rules (free slots, nearest, reorder, pack, the height a part needs); pure, app.js wraps it (`tools/test-layout.mjs`).
- `codec.js` — share links, the compact layout and the `.rack.json` file; pure (`tools/test-codec.mjs`).
- `connect.js` — the Connect cards (power and mains, Raspberry Pi 5, fans, PoE, lighting, UPS) for what a build holds; every fact sourced from `docs/audit/RESEARCH_SOURCES.md`, nothing guessed (pure; `tools/test-connect.mjs`).
- `printers.js` — printer presets and the print bed check: does a piece fit lying flat, straight or turned (`tools/test-printers.mjs`). app.js says what each print-list row prints (`framePieces`, `itemPieces`); the chosen printer lives in the UI settings (`labrax-planner-ui`), not in the layout.
- `airflow.js` — cooling model: air temperature per ½U layer, stack effect, fan curves, openings and walls. app.js describes the rack for it (airflow section).
- `power.js` — power budget: total draw (the same watts as the cooling estimate), PoE budget and ports per switch, network ports, UPS runtime. app.js describes the rack for it (power and network section); catalog fields `poe`, `poeIn`, `poeOptional`, `ports`, `eth`.
- `catalog.json` — all community parts (devices/mounts, panels, extras, hardware). See CONTRIBUTING.md for the schema.
- `tools/looks.html` — every part drawn from its shape (library drawing, front view, `&3d=1` for 3D), the custom part types last (`?ids=gen`); use it to check a new entry's look.
- `tools/validate.mjs` — catalog validator (also checks shapes through shapes.js); `.github/workflows/validate.yml` runs it and the syntax check on every push to main and every pull request.
- `tools/measure.mjs` — measures a model file (STL or 3MF) from `reference/`: U height, screw holes, openings, depth, shelf seat, top-mount tilt; compares it with the catalog entry named by the file and with the shapes.js drawing.
- `reference/` — local, git-ignored folder for downloaded model files (named by catalog id, e.g. `reference/sbc7.3mf`) used to measure the frame and the parts. Never commit them, or meshes or outlines traced from them; only the measured numbers go into catalog.json and shapes.js.

## Commands
- Run: `python3 -m http.server 8000` then open http://localhost:8000 (needs a server; `fetch('catalog.json')`).
- Check: `node tools/validate.mjs && for f in rack.js app.js parts.js shapes.js view3d.js pdf.js airflow.js power.js guide.js estimate.js market.js printers.js ready.js connect.js layout.js codec.js; do node --check $f; done && for t in tools/test-*.mjs; do node $t; done`
- Browser self-test (placement, undo, share link, rack file, PDF and ZIP export in the real page): serve the folder and open `/tools/selftest.html`; it puts your saved rack back afterwards.
- Measure: `node tools/measure.mjs [id …]` (all of `reference/` without ids; `--front=±axis`, `--up=±axis` when it picks the wrong face, `--svg` for an overlay in `reference/`, `--json` for numbers).

## Rules
- Review thread with the reviewer and Antigravity: `docs/audit/REVIEW.md`. Read it before working on the branch, claim files there before changing them, and answer findings there.
- Whole-U panels start on a U boundary (EIA hole pattern repeats per U); ½U panels may sit in either half.
- Never store or redistribute community model files; the catalog only links to MakerWorld/Printables. Parts look like their models because shapes.js draws them from the shape spec and the devices' published sizes; model photos are only a reference.
- Keep catalog ids stable; saved layouts, share links and rack files refer to them.
- Next steps are in ROADMAP.md.

- `tools/import-power-inputs.mjs` imports only reviewed `confidence: "page"` device input records; input alternatives and source evidence stay separate from typical watts/PoE calculations. Run the catalog validator after either importer.
