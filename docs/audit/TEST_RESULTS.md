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
