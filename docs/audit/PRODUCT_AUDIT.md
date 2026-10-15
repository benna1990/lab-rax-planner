# Product audit — Mini Rack Planner

Date: 15 October 2026 · Branch: `redesign/guided-builder` · Baseline: `main` at `6525604` (live on GitHub Pages).

## Method and limits

- **Code:** inventory of every module (`wc`, function map of `app.js`), catalog statistics computed from `catalog.json`, and targeted reading of the code paths named below. Not every line was read; findings cite the code they rest on.
- **Browser:** the live site in a fresh browser profile (empty `localStorage`) at 1440 × 900, 375 × 812 (phone, touch emulation) and the pane's default width. Interaction tests in earlier sessions on `localhost:8000` (placement, reorder, undo, PDF and ZIP export) are referenced where they apply.
- **Not done:** no tests with real users, no screen-reader pass, no test on a physical phone. UX findings come from heuristic review and simulated walkthroughs (see `UX_FINDINGS.md`).

Severity: **S1** can lead to an unsafe or unbuildable result · **S2** blocks or misleads a typical user · **S3** costs time or trust · **S4** cosmetic.

## The most serious problems

1. **There is no route from "empty" to "ready to build".** The app opens on an example rack with 66 visible buttons and three dense columns. Nothing says where to start, and nothing says when you're done (A1, A3).
2. **The example build fails its own checks.** On a first visit, the cooling summary says "Warm, ≈ 39 °C" and Power & network says "Short, 10 / 9 ports". A newcomer's first impression is a rack that doesn't work (A2).
3. **Everything is one kind of thing.** Other rack designs (LowProfile, mATX frame, Tandem), add-ons (handles, LEDs), frame spare parts and parts that go inside the rack all sit in one "extras" list. Devices and their printed mounts share a row (A4).
4. **Verified and estimated look the same, apart from heights.** 220 of 507 entries have an estimated height, none records a licence, 93 have no author and 21 list their hardware. The 3D frame uses estimated sizes, but the UI only marks estimated heights with "≈" (A5, A14).
5. **Dimensions live in four places.** These are `catalog.json` `frame.dimensions`, `shapes.js` (`U`, `PANEL_W`, `HOLE_X`), `parts.js` (the same constants again) and `view3d.js` `FRAME` (estimates). The 3D view and the build plan can drift apart (A6).
6. **Electrical guidance is thin where it matters.** The planner adds up watts, PoE and ports, but doesn't say which power supply, adapter or cable each device needs, or how to power fans and LEDs. Without that, a beginner can't finish the build (A7).

## Underlying causes

- Features were added as sections of one long "Your build" column, each with its own summary and style, without a shared model of *progress* or *severity*.
- The catalog schema grew per feature (`estimated`, `labrax`, `fit`, `watts`, `wattsEstimated`, `vent`, `fanDir`, `at`, `pw`…) without a general notion of *evidence*.
- `app.js` holds state, rendering, calculations, exports and a single ~190-line click handler (230 top-level functions, 57 lines over 300 characters, the longest 968). Changes are hard to review and easy to break.
- Tests cover the pure modules (`estimate`, `market`, `power`, `printers`) but not placement, persistence, sharing or exports.

## Issue register

| ID | Sev | Area | Finding and evidence | Impact | Recommendation | Status |
|---|---|---|---|---|---|---|
| A1 | S2 | Onboarding | Fresh visit: an example rack, 66 visible buttons at 1440 px, three columns. The only start hint is a small "Example layout · Set up your own" chip and the header "Set up a rack". | Beginners don't know where to start. | A start screen with four clear choices (scratch, template, example, open file), and a step bar for orientation. | Done (a66ffbc) |
| A2 | S2 | Onboarding | The example build fails its own checks: cooling "Warm ≈ 39 °C", Power & network "Short 10 / 9 ports" (fresh profile, live site). | First impression: the tool or the rack is wrong. | An example that passes every check, with checks to keep it that way. | Done (a66ffbc): the new example passes; checked in the browser |
| A3 | S2 | IA | "Your build" has 8 top sections and 10 subsections (print, budget, cooling, power, shopping, guide, frame) with no overall status. | No answer to "am I done, and what's missing?" | A **Build readiness** check at the top: each check's status, why it matters and how to fix it. | Done (a66ffbc) |
| A4 | S2 | IA / catalog | `catalog.extras` mixes rack variants (LowProfile, mATX, Tandem, extensions), add-ons (handles, LEDs, feet) and inside parts. Device rows put the device and its mount together. | Users can't tell a rack system from an add-on or a mount from the device. | Separate rack systems, components, add-ons, devices, guides and resources (see `INFORMATION_ARCHITECTURE.md`). | Partly done (4d83fab): rack systems and variants in step 1, add-ons by side, device rows name the mount. Guides and Resources sections still to do |
| A5 | S2 | Data trust | 220 / 507 estimated heights; 0 licence fields; 93 without author; 21 with hardware; `labrax` (72) and `fit` (19) carry undocumented meaning. | Users can't judge what to trust before printing and buying. | Verification states per claim (Verified, Documented, Community reported, Estimated, Unknown) with method and date. | Partly done (ea1dbd7, a80d19d): schema, validator and display; 5 parts verified; a missing flag counts as Unknown, not Documented; new entries need a licence. Licences and sources for the existing 507 entries are still to be filled in |
| A6 | S2 | Architecture | Rack dimensions in `catalog.json`, `shapes.js`, `parts.js` and `view3d.js` (`FRAME`, marked as estimates). | 3D and the plan can disagree; fixes must be made four times. | One source (`catalog.frame` / a rack-system record), read by every module. | Proposed (Batch 3) |
| A7 | S1 | Electrical | Power & network totals watts, PoE and ports but doesn't map devices to supplies, adapters and cables; fans and LEDs have no wiring guidance. | Unsafe improvisation, or wrong purchases. | A "Connect" step with per-device supply needs from documented specs, and wiring cards that only show what's documented. | Partly done: Connect cards with sourced facts for mains, Pi 5, fans, PoE, logo LEDs and UPS. A device's power input type isn't in the catalog yet, so most devices still say "check its manual" |
| A8 | S3 | Onboarding | The setup wizard asks for colours ("Look") first, then build, name, hardware. | The function comes after the cosmetics. | Hardware first, then rack size and options, and the look last. | Done (0a612b7) |
| A9 | S3 | Mobile | At 375 px the page is 3,785 px tall (rack, then library, then build). The header wraps to 149 px, and 35 buttons are under 32 px. Adding a part from the library gives no visible feedback near the library. | Hard to use on a phone. | Step navigation, a compact header, larger touch targets, and feedback where the action happened. | Batch 1 (header), Batch 2 |
| A10 | S3 | Terminology | Mixed or jargon terms: "Where", "Flat · front", "Frame & extras", "mount", "½U", "≈", "seams". | Harder to learn. | A glossary with inline explanations for U, depth, PoE, airflow, inserts and keystones; consistent labels. | Partly done (283ef60): "?" help for U, depth, PoE, airflow, inserts and estimates; Where's Frame renamed Inside |
| A11 | S3 | Maintainability | `app.js`: 2,198 lines, 230 functions, one large click switch, 57 lines over 300 characters. | Slow, risky changes. | Split it step by step into modules (state, catalog, layout, checks, exports, UI) with no new framework. | Proposed (ongoing) |
| A12 | S3 | Quality | Tests exist only for `estimate`, `market`, `power` and `printers`, plus the validator. Placement, collisions, save/load, undo, share links, PDF and ZIP have no tests. | Regressions go unnoticed (two were caught by hand this week: a hidden colour scale on the PDF and a fan direction that flipped). | Node tests for the pure logic, and a browser smoke test for exports. | Done for logic and exports: Node tests for layout, codec, ZIP, readiness and Connect (in CI), and a 16-check browser self-test for placement, undo, share links, rack files, PDF and ZIP. Not in CI: the browser self-test |
| A13 | S3 | Shopping | Shop links are searches, not product listings. The UI groups them as links per shop. | Users may read them as verified products. | Label them "search" and keep verified listings separate. | Proposed |
| A14 | S3 | 3D | The 3D frame uses estimated sizes (`view3d.js` comments) but looks exact. | False confidence in fit. | A note in 3D and in the readiness check: "frame sizes estimated; fit not verified". | Done in readiness ("Frame sizes are estimates"); not yet in the 3D view itself |
| A15 | S3 | Reliability | three.js, jsPDF and qrcode load from CDNs; failures show a message (checked in code), with no offline fallback. | The PDF or 3D view is unavailable offline. | Keep the messages; consider vendoring the files. | Noted |
| A16 | S2 | Warnings | Warnings differ by section; the depth and overlap warnings were rewritten this week (short text, reason in a tooltip, a fix button), the others not. | Users don't know what to do. | One warning pattern: problem, consequence, fix action. Used by the readiness check. | Done for readiness: problem, reason, fix button |
| A17 | S3 | Security | Catalog text goes through `esc()` in the code read; not every `innerHTML` (39) was reviewed. | Low risk (the catalog is first-party), but contributions will add data. | Review all `innerHTML` sinks before accepting outside catalog contributions. | Proposed |

## What already works and must be kept

Placement with ½U snapping, reordering and undo/redo; depth-clash and ½U overlap detection; modular slots (boards, drives, keystones); the parametric part maker with manifold STLs; printer-bed checks; power, PoE and port counting; the cooling model with fan directions; the PDF with heatmap and QR; the build pack ZIP; share links and rack files; regional shop links with an affiliate disclosure.

## Findings from the first review (`AUDIT-NL.md`): status

`AUDIT-NL.md` is an older snapshot (it counts 441 records; the catalog now has 507). It's used here as a list of findings, not as the current status.

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | The print list groups by model page, not by print variant | Resolved for the tested cases. One row per model page, because each page is downloaded once; the variants printed from it are named per row ("½U ×1, 1U ×1"). Custom parts with the same name but other settings stay separate rows | self-test checks 10 and 11 |
| 2 | Fasteners incomplete; extras' hardware missing; unknown amounts shown as zero | Partly. The hardware of extras, the top and the bottom is counted. Parts without their own hardware list now show as an unknown row in the shopping list and as a note in readiness. Only 21 entries list hardware, so this remains a data gap | self-test check 12; `orderList()` / `noHardwareParts()` |
| 3 | PDF content can fall off the page (10U) | Resolved for text. A full 10U rack gives 7 pages with every text line inside A4. Images and overlapping text aren't checked | self-test check 14 |
| 4 | A PDF failure silently drops the PDF from the ZIP | Resolved. The status names the missing PDF, with a button to try again | self-test check 15 |
| 5 | The validator doesn't cover product certainty | Partly. Evidence states and licences for new entries are checked; links, files and geometry aren't | `tools/validate.mjs` |
| 6 | Dimensions mostly unverified | Open. 5 parts are verified by measurement. Readiness notes the estimated frame sizes and heights. Frame dimensions still live in four modules (A6) | `CATALOG_VERIFICATION.md` |
| 7 | No print time, filament or costs | Done, as labelled estimates (`estimate.js`): filament per colour, print-time allowance and a budget with prices per region | `tools/test-estimate.mjs` |
| 8 | Acrylic isn't a real build option | Partly. Acrylic sides and bottom change the print list, the shopping list (with cutting services) and 3D. There's no measured cutting file (DXF/SVG) yet, and no checked hole positions | — |

**Buildability is not proven yet.** Hardware lists, a single source for the frame dimensions, the power input per device and the physical fit of parts and devices are still partly or wholly missing. Those are the next priorities, before more interface work.
