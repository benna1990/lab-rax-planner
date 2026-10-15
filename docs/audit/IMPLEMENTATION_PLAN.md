# Implementation plan

Work happens on the `redesign/guided-builder` branch. `main` (the live site) stays unchanged until the branch is reviewed. Each batch is small enough to test on its own, keeps saved layouts working, and is recorded in the changelog below.

## Priorities

| Priority | Theme | Why |
|---|---|---|
| P0 | Audit, orientation and status (step bar, readiness check, start screen, a sound example) | Fixes the biggest problem: no route, no "done" |
| P1 | Taxonomy (rack systems, devices, components, add-ons), verification states, the wizard order, a glossary | A trustworthy catalog and understandable words |
| P1 | Connect step: per-device supplies, fan and LED cards from documented sources | From a virtual layout to a real, safe build |
| P2 | One source for rack dimensions; better fit checks (cables, connectors, clearance) | Fewer wrong prints and purchases |
| P2 | Countries: plugs, mains equipment, shop links labelled as searches | International use |
| P3 | Other rack families, contributions, advanced features | Only once the basics are solid |

## Batches

### Batch 1: orientation and status (P0)
- **Step bar:** 1 Rack · 2 Hardware · 3 Connect · 4 Check · 5 Print & assemble · 6 Export. Each step jumps to its area, with a status dot from the readiness check.
- **Build readiness:** at the top of *Your build*.
  - Checks: all parts placed, no depth clashes or ½U overlaps, printer chosen and the prints fit it, cooling, power and PoE, network ports, data still estimated, country.
  - Each check shows its state (ready, needs attention, to do, unverified), one sentence of why, and a fix button.
- **Start screen** on a first visit: start from scratch, use the setup guide, start from the example, or open a build file.
- **Example build** that passes its own checks, with a test that keeps it that way.
- **Readiness as a pure function,** with Node tests.

### Batch 2: words and structure (P1)
- The wizard asks for hardware first and the look last.
- A glossary with inline "?" explanations: U, ½U, depth, PoE, airflow, intake/exhaust, heat-set insert, keystone.
- The library: rack systems move into step 1; add-ons separate from frame variants; device rows read "device → mount".
- `evidence` and licence in the catalog (`CATALOG_VERIFICATION.md`), with the validator and a legend in the UI.
- Tests for placement, collisions, save/load, undo and share links.

### Batch 3: connect (P1), based on `RESEARCH_SOURCES.md`
- Per device: how it's powered (USB-C PD, barrel jack, PoE, mains), from documented specs only. Unknown stays "check the manual".
- Cards for fans, LED lighting and PoE that appear only when the build has them. They show documented wiring only, and say so when a pinout is unknown.

### Batch 4: dimensions and fit (P2)
- Rack dimensions come from one record, read by `shapes.js`, `parts.js`, `view3d.js` and `app.js`.
- The 3D view labels estimated frame sizes.

## Changelog (actual changes on this branch)

| Date | Change | Commit |
|---|---|---|
| 2026-10-15 | Audit documents (this folder) | 12e208f |
| 2026-10-15 | Batch 1: step bar, Build readiness (`ready.js` + test), start screen, an example that passes its checks, export buttons and the country choice in readiness | (next commit) |
