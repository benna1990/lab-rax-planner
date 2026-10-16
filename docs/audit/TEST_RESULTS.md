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

## T-7 — fuller PDF regression and visual recheck (Codex, 16 October 2026)

**Correction:** R-9's earlier claim of clipped section headers was a review error. Inspection of the original PDF content streams and the separately opened page-3 PNG shows a banner beginning at 30 mm and the normal header at 18 mm. No missing-header fix was needed. The new regression protects the top margin on both fixtures.

**R-10 reproduced and fixed:** the 11-part front/rear 10U fixture generates 8 pages with the pre-change pdf.js. When placement flows onto a continuation page, the frame table was still held below the previous page's top-view drawing. It now follows the continuation rows; the power block fits below it, removing its otherwise mostly empty page. No font size was reduced.

**Validation:** catalog validator, all Node tests and PDF syntax pass. Independent Chromium run: **18/18 checks pass**, including exact fuller-fixture placement, top margins, geometry bounds, text overlap and a maximum of 7 pages. The original 17 checks remain. Both generated PDFs have **7 pages**.

**Visual check:** rendered and inspected all 7 pages of each fixture with Poppler. Cover directory, schematics, placement, frame table, checklist, cooling and assembly cards are legible; no obvious clipping or text/image collision observed. Fuller PDF page 3 now groups the remaining placement row, frame table and power block. Some white space remains because the checklist and illustrated guide start their own sections; no standalone near-empty power page remains.

Local outputs (not committed):
- `output/plan-10u-full.pdf`, SHA-256 `fb8cc71d2a4537b9fcdbaf5269b60d33c0e7ad1a023ef97632b2b62fb10239fa`.
- `output/plan-10u-selftest.pdf`, SHA-256 `147d77b78caf1be3e4f1d3109a5c7ff85d5e1f4e8db60f59b20d9e0ef95a6455`.

Shared dimensions: PDF schematics and image dimensions now read the supplied rack.js dimension record. A direct before/after run retained identical page-2 drawing geometry (excluding the page-total footer), and identical image dimensions/positions across the document (excluding page numbers). Layout reflow is intentional. These checks do not establish physical fit or electrical correctness.

## T-8 — beginner walkthrough (Codex, 16 October 2026)

Fresh Chromium profiles at 1280 × 900 and touch-emulated 375 × 900. Followed start card → Guide me → choose UCG-Max → default Build/Look/Name → Create rack → Hardware library search → add USW-Flex-Mini → accept offered 4U rack → Where/Back → Connect → Print → Export → Download PDF. Both PDF downloads succeeded (`output/t8-build-1280.pdf`, `output/t8-build-375.pdf`). Document width matched viewport width at both sizes.

Findings R-11 and R-12 are in REVIEW.md: the wizard creates a half-U overlap, and mobile step targets are partly hidden by the sticky header. The wizard remained operable and the growth confirmation worked. Connect clearly states that undocumented device inputs require the manual; that known data gap is T-3, not a new defect. This is a simulated walkthrough, not real-user testing; no physical phone, Safari, Firefox or screen reader was tested. Screenshots are in local output/t8-*.png (not committed). No application code was changed for T-8.

## T-9 — wizard, step navigation and shared PDF width (Codex, 16 October 2026)

Commit `eaf8e9d`: catalog validator and all Node tests pass; independent Chromium self-test **20/20**. New regressions drive the actual beginner wizard (UCG-Max, defaults) and require zero build warnings, then check that Print and Export targets remain below the sticky header.

Repeated the complete UI walkthrough at 1280 and 375 px. The wizard now produces 4U with no initial overlap. Both PDF exports succeed. At 375 px the measured header bottom was 149 px; Connect, Print and Export target tops were 433.7, 257.3 and 231.3 px, respectively. Visually checked screenshots `output/t9-nav-375-5.png` and `output/t9-nav-375-6.png`: headings and PDF/ZIP buttons are visible. Current PDF width substitution preserves 280 mm output; no change of dimensions or verification status.

Additional existing editor behaviour surfaced during the follow-up: adding a half-U Flex Mini mount can choose an overlapping nominal slot and display a warning (R-14). That was not changed by the wizard fix.
