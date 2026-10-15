# Lab Rax Planner (RackBuilder)

Static web app for planning 3D-printed Lab Rax 10" homelab racks. No build step, no framework. UI text is English.

## Files
- `index.html` — markup and all CSS (light/dark tokens on `:root`, `data-theme` toggle).
- `app.js` — state, library, 2D front view, build column, build pack ZIP, part maker dialog. Saves to localStorage (`labrax-planner-v2`).
- `parts.js` — parametric custom parts (three.js geometry), binary STL writer, stored ZIP writer. 10" constants live at the top.
- `view3d.js` — 3D view (three.js r128 from cdnjs, OrbitControls/STLLoader/3MFLoader from jsDelivr). `FRAME` holds frame dimensions.
- `pdf.js` — build plan PDF with jsPDF 2.5.1.
- `catalog.json` — all community parts (devices/mounts, panels, extras, hardware). See CONTRIBUTING.md for the schema.
- `tools/validate.mjs` — catalog validator; `.github/workflows/validate.yml` runs it and the syntax check on every push to main and every pull request.
- `reference/` — local, git-ignored folder for downloaded model files used to measure the frame. Never commit them.

## Commands
- Run: `python3 -m http.server 8000` then open http://localhost:8000 (needs a server; `fetch('catalog.json')`).
- Check: `node tools/validate.mjs && for f in app.js parts.js view3d.js pdf.js; do node --check $f; done`

## Rules
- Whole-U panels start on a U boundary (EIA hole pattern repeats per U); ½U panels may sit in either half.
- Never store or redistribute community model files; the catalog only links to MakerWorld/Printables.
- Keep catalog ids stable; saved layouts refer to them.
- Next steps are in ROADMAP.md.
