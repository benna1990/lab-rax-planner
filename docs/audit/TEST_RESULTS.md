# Test results

Updated 15 October 2026, branch `redesign/guided-builder`. What passes here proves the tested logic and the checked outputs. It doesn't prove a correct PDF layout beyond the checks below, and it doesn't prove that printed parts fit.

## Node (run in CI on every push: `.github/workflows/validate.yml`)

| Check | What it covers | Result |
|---|---|---|
| `node tools/validate.mjs` | catalog schema, shapes, evidence states (verified needs a method and a date, documented a source), a licence for every entry not in `tools/catalog-baseline.json` | pass, 507 entries. A new unlicensed entry fails (tried on a copy) |
| `node --check` on 15 scripts | syntax | pass |
| `tools/test-layout.mjs` | alignment, collisions per side, free and nearest slots, the height a part needs, reorder in a full rack (incl. a whole U of ½U parts), pack | pass |
| `tools/test-codec.mjs` | share link and rack file round trips, defaults left out, non-ASCII text, a newer file version, bad base64, wrong format, an 11U rack, unknown settings | pass |
| `tools/test-zip.mjs` | the build pack's ZIP writer: CRC-32 check value, stored entries, UTF-8 names, offsets | pass |
| `tools/test-ready.mjs` | build readiness: complete, empty, broken and warm builds, part hardware as a note | pass |
| `tools/test-connect.mjs` | Connect cards only when needed, numbers from the build, https sources, no wiring for undocumented lights | pass |
| `tools/test-estimate.mjs`, `test-market.mjs`, `test-power.mjs`, `test-printers.mjs` | costs, shop links, PoE/ports/UPS, print beds | pass |

## Browser self-test (`/tools/selftest.html`, 16 checks)

It runs the real planner in a frame (Chromium, the Claude desktop browser pane) and puts the saved rack back afterwards. Last run: all 16 passed.

1. The start screen shows on a first visit.
2. The example passes its checks, apart from picking a printer.
3. "Start empty" gives an empty rack.
4. Parts go to the first free slot.
5. Reorder works in a full rack.
6. Undo and redo.
7. The rack file round-trips.
8. PDF export: 6 pages.
9. Build pack ZIP: 7 files, including the PDF, the `.rack.json` and the shopping list CSV.
10. Print list: two variants from one model page share a row, and both variants are named.
11. Print list: two custom parts with the same name but other settings stay separate.
12. Shopping list: a mount without its own hardware list shows unknown hardware.
13. No errors while building.
14. PDF at 10U with a full rack: 7 pages, and all 335 text lines inside A4. This checks text positions only, not images or overlapping text.
15. A failed PDF is reported in the status, not silently left out of the build pack.
16. The share link opens the same layout.

**Limits:** run in one browser engine only (no Safari or Firefox), and not in CI, because that would need a headless browser as a dependency. This test was run by Claude in its browser pane; open the page yourself to repeat it.

## Not tested

Real users, a screen reader, a physical phone, the visual quality of the PDF beyond the text check, and anything physical: print quality, the fit of parts and devices, electrical behaviour.

## Independent visual check — Codex, 15 October 2026

Rendered and inspected all **8 pages** of the available `output/plan-10u-full.pdf` with Poppler, at 1400 px per page. Artifact SHA-256: `674cd3309f7bf2a7cb8e629538b38c56ce02e9ee7b1ff5968ee538736ad6dbff`. This is not the previously reported 7-page artifact.

- Pages 1, 2, 4 and 7: readable cover, schematics, checklist and illustrated steps; no obvious clipping or overlap seen.
- Pages 3, 5, 6 and 8: section banner begins at the top edge with part of its background outside the page; missing normal top margin/header. Recorded as R-9 in REVIEW.md.
- Page 3 has one overflow placement row and a distant frame table. Page 6 is mostly empty apart from the power summary. Recorded as R-10.
- No physical dimensions, wiring, numerical recommendations or QR decoding were verified by this visual pass. PDF visual approval remains open pending a regenerated artifact and review.

Catalog validator and every `tools/test-*.mjs` were independently rerun by Codex in this round: all pass.

### Independent browser rerun — Codex

Playwright with a fresh temporary headless Chromium profile, against `http://127.0.0.1:8000/tools/selftest.html`: **all 17 checks passed**. Current generated 10U self-test output: 7 pages, 335 text anchors; geometry check: 348 text lines and 2,837 images/boxes inside bounds without detected text overlap. These checks agree with the documented pass status (geometry object count differs from the earlier 2,819). This does not visually approve the separate 8-page sample file inspected above; request a regenerated sample to resolve that discrepancy.

## T-2 shared dimensions — Codex

Implementation commit `5647837`: `rack.js` supplies the common dimensions to parts, shapes, 3D, app calculations and exports; duplicate `catalog.frame.dimensions` was removed. Node loaders and both HTML entry points load rack.js first. Catalog device records were unchanged.

Validation after the refactor: catalog validator, syntax checks on all 16 application scripts, every Node test, and the independent Chromium self-test **17/17** pass.

Compared the saved pre-refactor sources with the new sources in separate fresh Chromium contexts at 1440 × 1000. Front SVG plus shape primitives for all catalog panels/device mounts had identical SHA-256 (`9411cf1971fc2d35809703a9dc39c99a840daa51e9f1303a6c7e84d8a15b6292`). Shared 3D FRAME data was identical. With the example visible and animation paused, the rendered 3D canvas screenshot was byte-identical (`dd62ab20535a0ddb0337b8053595fde0da24f1afec5876fbe66d0b12db13ae13`). Binary STL output was byte-identical for a 1U blank, 2U hex vent and 40 mm fan panel. Temporary comparison inputs/screenshots are under /tmp/rack-before and /tmp/rack-3d-{before,after}.png, not committed.

Scope limit: pdf.js still has its own schematic constants (U, bay width and hole spacing). That file was left to Claude for R-9/R-10; it receives the shared dimensions through pdfData but should also use those fields for the remaining schematic constants. No physical fit was established by this refactor.

**Clarification from Claude, checked in the shared thread:** the 8-page sample was generated after `027c5b9` with additional front/rear parts. The page-count difference therefore reflects a different fixture, not evidence of stale generator code. R-9/R-10 remain valid findings on that fuller sample; the passing lighter self-test does not cover it. Claude is adding that configuration to the regression checks.
