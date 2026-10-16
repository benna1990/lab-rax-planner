# UX and visual audit, 16 October 2026

*Claude, as lead product designer. Findings are R-17 to R-34 in [REVIEW.md](REVIEW.md); tasks are T-14 to T-19 there. Mock-up: [visual-proposal.html](visual-proposal.html) (open it through the local server).*

## Method and limits

- **Real app, two widths.** Branch `redesign/guided-builder` at `06f36a1`, served locally, in the desktop app's built-in browser at **1280 × 800** and **375 × 812** (emulated), in a separate origin (`127.0.0.1:8000`) with cleared storage for each first visit. The owner's saved rack on that origin was backed up first and put back afterwards.
- **How I operated it.** At 1280 px the browser pane is scaled down, and coordinate clicks landed in the wrong place. So buttons were pressed through the DOM (real `click` events; pointer events for selecting a part), keys with real key presses, and every screen was checked with screenshots and the page text. Downloads were caught in the page (file name, size, type, contents) instead of being saved. A file open was simulated with a `File` object on the real input.
- **Two rounds.** First the main route as a first-time visitor (wizard → first build → print, shop, export), noting every hesitation; then targeted probes of those moments: full racks, shrinking, adding into a full rack, share links over an existing rack, broken files, profile mismatches.
- **Not tested:** dragging parts with a mouse or finger, tapping parts in the 3D canvas, a screen reader, the live site, a real print. The PDF was checked by its page count and text, not looked at page by page (Codex did that in T-7).
- **Cache.** Once, the browser ran a stale `ready.js` from its cache after Codex's commit `4384d11`. I rechecked that observation with fresh scripts and dropped it. See risk V-1 below.

Screenshots are in `output/ux/` (local, not committed).

## Verdict

The planner already does the hard part: it knows a lot about racks, says honestly where its numbers are estimates, and its wizard, readiness list and exports form a real route from "I have a gateway and a Pi" to a build pack. Codex's recent fixes (wizard overlap, step jumps, physical fit, profiles) hold up.

For a beginner it still fails in three places:

1. **The first rack it suggests isn't the rack a beginner should build.** Three small devices become an 8U rack with stranded half-U gaps; a plain Raspberry Pi 5 gets a PoE-HAT tray and then a problem the planner created itself; a printer with a 180 mm bed is asked for and then ignored until the end.
2. **Some output is wrong or can be lost.** The example's shopping list buys 7 Pi power supplies for 4 Pis, and opening a share link silently replaces your own saved rack.
3. **Green checks and "Done" promise more than the data holds.** Power and cooling show ✓ while every device's power is unsourced; "Print & assemble: Done" before anything is chosen or printed.

The visual design is calm and technical, and its tokens, fonts and dark stage are good foundations. What it lacks is a hierarchy that says *what to do next*: the brightest thing on the screen is an export button, one green means four things, and buttons look like status chips.

## Visual design review

Each point says what I saw, whether it's a **readability or operating problem (demonstrated)** or a **preference**, and what to keep.

### Layout and screen space
- **Desktop (1280).** Three columns: library 250 px, stage about 570 px, build column about 400 px. The stage gets the most space, which is right for a visual planner. But the build column's text is only about 230 px wide because every problem has its button beside the text: "Print profile does not match the frame" wraps to eight lines (`output/ux/11-visual-top-1280.jpg`, `12-visual-light-mid-1280.jpg`). **Demonstrated** (readability).
- **Rack settings live under the stage** (frame, sides, three rows of eight colour swatches, name), far from step 1 "Rack" in the step bar. The centre column mixes "look at the rack" with "configure the frame". **Preference**, with a navigation cost: "1 Rack" jumps to the middle of the page.
- **Stage overlay.** Five equal-weight pill buttons over the 3D view (Reset view, From the back, Printed sides, Rotate model, Load STL/3MF). They compete with the rack and with each other. **Preference.**
- **Phone (375).** One long column: rack, then the library at about 1,430 px and the build readiness at about 2,510 px. The sticky header is 149 px tall (18 % of the screen) and holds Guides, Set up a rack, Build plan PDF and Download build pack, while the step bar scrolls away under it (`13-visual-ready-375.jpg`, `14-visual-library-375.jpg`). **Demonstrated**: the space that stays on screen holds export actions, not navigation or status.

### Positions
- The **primary action in the header is "Download build pack"**, green and filled, from the first second and on an empty rack (`01-first-visit-1280.jpg`, `10-first-visit-375.jpg`). The next step is never the brightest thing. **Demonstrated** (it competes with the start card and the wizard).
- **Step bar under the header** is the right idea and in the right place on desktop; on phones it scrolls sideways and "4 Check" is cut off.
- **Status line** ("placed at U4 · Undo") sits under the stage; on phones it is off screen while you add from the library (status top at −357 px after an add). **Demonstrated.**

### Shapes
- **103 elements are pills** (radius 999 px): buttons, segmented controls, chips and badges. Plus 9, 10 and 14 px radii for cards and inputs. "Choose" (a button) and "✓ chosen" (a status) are the same small pill in different colours, side by side (`14-visual-library-375.jpg`). **Demonstrated** (action and state look alike).
- Cards, segmented controls and the start card are consistent and calm. **Keep.**

### Colour
- The accent green means four things: the primary action, the selected card's border, a ✓ status and a done step. **Demonstrated**: after choosing "Side handles", its card has a green border, a green "✓ added" chip and a green Download button above it, and nothing says which of these is clickable.
- Orange-brown is used for problems ("!"), for steps that need attention, and as the whole heat palette (warm chips). A warm chip reads like a warning. **Preference with a risk**: once warnings matter, they need their own hue.
- Light theme: muted text on `--bg` is 4.59 : 1 (just above AA); dark theme 6.3 : 1 or more. **Fine; keep.**

### Typography
- **13 font sizes** between 10.5 and 30 px, most text between 11.5 and 13.5 px, **5 weights** (400–800). In a tool that asks you to read a lot (readiness, shopping, Connect), 12 px body text with a 230 px measure is tiring. **Preference**, partly demonstrated by the wrapped problem rows.
- Geist Mono for measurements under the stage ("222 mm usable width · 266.7 mm inner height") is a good, technical touch. **Keep, and use it for every measurement.**

### Alignment and rhythm
- Paddings of 8, 9, 10, 12, 14 and 16 px occur next to each other; the library's long profile note runs edge to edge under a card (`12-visual-light-mid-1280.jpg`). **Preference.**

### Visual balance
- **Too loud:** the Download button, the green borders of chosen items, the five stage pills.
- **Too quiet:** the next step, the problem count on phones, the "≈" and "unknown" evidence states (plain grey text, no shape).

### Desktop and phone
- Desktop feels designed; the phone layout is the desktop stacked, with every section still open below the rack. **Demonstrated** by the distances above.

### Character
- Dark stage, lime "Lab Rax" label, Plus Jakarta Sans and Geist Mono give a credible "workbench" look that fits a technical building tool. **Keep.**

### Keep
- The token system with light and dark (`:root`, `data-theme`), Plus Jakarta Sans + Geist Mono + Audiowide for the rack label.
- The dark stage and the 3D/Flat/Airflow switch; the Where bar as a segmented control.
- The readiness framing: "What still stands between this plan and a rack you can build."
- Status sentences with Undo; the explicit info rows ("Frame sizes are estimates").
- The start card's four ways in.

## Visual proposal: one workbench, one next step

The mock-up ([visual-proposal.html](visual-proposal.html); screenshots `output/ux/20-proposal-desktop.jpg` and `21-proposal-mobile.jpg`) shows the desktop after the wizard and two phone screens. The idea: **the screen always answers "what now?"**, and every colour and shape has one meaning.

### Layout and positions
- **Desktop:** a 56 px top bar holds the logo, the **step bar with a text state per step** (centre), and Guides, *New rack ▾* and *Export ▾* (right, secondary). Columns: library 320 px, stage fluid, build column 360 px.
- **Stage:** view switch top left, height top right, a **status strip** under the rack with the most important open problem and its simplest fix as the button. The stage tools become three 36 px icon buttons in the bottom-right corner; Load STL/3MF moves into the selected part's panel.
- **Build column:** a **Next step** card (one sentence, one button), then "Before you build" (problems with the text first and the button *below*), then collapsed sections: Print list, Shopping list, Power & network, Connect, **Rack settings** (moved here from under the stage).
- **Phone:** a 60 px header with the current step, its state and a six-segment progress bar; *Steps ▾* opens the steps as a sheet. A bottom bar with **+ Add part** and **Next: …** (44 px). The library opens as a **sheet over the rack**, so you see where a part lands and the confirmation sits next to your finger.

### Colour roles
- **Green fills only actions** (primary button, links, the + of a library row) and the ✓ of a done step.
- **Selection is neutral**: a 2 px white (dark) or ink (light) outline.
- **Problem** red-orange `#F07A4A` with a filled "!"; **decision to make** amber `#E5A23A` with a ring; **estimate** dashed grey "≈"; **unknown** hollow grey "?".
- The **heat palette** stays only in the Airflow view and heat chips.

### Shapes
- **Buttons**: 8 px rectangles, 36 px high on desktop, 44 px on phones.
- **Pills** only for chips and segmented controls. **Cards** 12 px.
- **Chips** for measurements in mono; a dashed border means "not sourced".

### Type and rhythm
- **Six sizes**: 12 meta, 13 secondary, 14 body (line height 1.45), 16 section title, 20 panel title, 28 start heading.
- **Weights**: 400, 600 and 700 only.
- **Geist Mono** for U, mm, W and °C.
- **A 4 px grid**: 4 / 8 / 12 / 16 / 24; card padding 16, gaps between groups 24.

### Why this helps both looks and use
- One loud element (the next step) instead of three makes the screen calmer and tells a beginner where to go.
- Separate colour and shape roles remove the "is this a button or a state?" doubt, which is also what makes it look tidy.
- Moving rack settings out of the centre gives the rack the stage and puts settings where step 1 points.
- On phones, the screen space that never scrolls away is spent on status and the next action instead of exports.

## Improvement plan

**Order:**
1. **Wrong output and lost work**: R-17, R-18, and the export half of R-30.
2. **Wrong choices made for the beginner**: R-19 to R-22.
3. **Trust and orientation**: R-23 to R-26, then R-27 to R-31.
4. **Visual system**: R-33 and R-34, with R-32 as polish.

Shared causes get one fix:
- **R-20 and R-21** share the half-U space model.
- **R-23 and R-26** share "status from data we don't have".
- **R-24, R-25, R-33 and R-34** share the missing "next step" hierarchy.

### The five most important improvements

| # | Improvement | Findings | Who | Depends on | Claude checks at review |
|---|---|---|---|---|---|
| 1 | **Correct counts and never lose a rack.** Modular parts count their filled slots; a share link or file asks before replacing a saved rack and keeps a "previous rack" to go back to; exports keep "optional". | R-17, R-18, R-30 | Codex (T-14) | none | Example rack: 4 Pi supplies, 4 USB-C cables, patch cables follow; share link over an own rack asks first, and the old rack comes back after a reload; CSV and README mark optional items; self-test checks for both. |
| 2 | **A compact, buildable first rack.** Filler blanks never push parts down; room to grow stays open space that a new part takes; vents only when the airflow model asks for them, with the reason; the wizard picks a mount that needs no extra add-on (no PoE HAT unless chosen); the printer answer changes the plan or blocks with a clear choice; free space counts only usable space. | R-19, R-20, R-21, R-22 | Codex (T-15); Antigravity (T-19) for mount add-ons and small-bed variants | T-19 only for the data; the layout fix can start now | UCG-Ultra + Flex Mini + Pi 5 with defaults gives ≤ 6U and no problems; adding a 1U device then fits without growing; "1U open" never sits next to "doesn't fit"; A1 mini shows the 254 mm limit at step 2 of the wizard. |
| 3 | **Status only as strong as its data.** ✓ only for sourced inputs; estimates shown as "≈" with how many are sourced; step states in words and true to what is done. | R-23, R-26 | Codex (T-16); Antigravity (T-3) supplies sourced power | none: the display ships now and shows 0 sourced until T-3 lands | No green ✓ on power or cooling while 0 devices are sourced; "Print & assemble" is never "Done" before anything is printed; every step state readable without colour. |
| 4 | **One next step on every screen** (the visual proposal). Phase A: colour, shape and type tokens (R-33, R-34). Phase B: top bar with steps, Next-step card, status strip, rack settings into the build column (R-24, R-26). Phase C: phone header, bottom bar and library sheet (R-25). | R-24, R-25, R-33, R-34 | Codex (T-17), in three commits | Phase A first; B and C after T-16's states | Side by side with the mock-up at 1280 and 375; only one green-filled element per screen; header ≤ 60 px on phones; problems visible without scrolling after the wizard. |
| 5 | **No dead ends while finding and changing parts.** Search tells you about matches in other Where tabs; Flat view says what it shows; a placed device can change its mount; keyboard reaches parts in every view; 44 px targets on phones; wording fixes. | R-27, R-28, R-29, R-31, R-32 | Codex (T-18) | none | "handles" in Top points to Sides; a placed Pi 5 can switch to the USB-C tray in place; Tab reaches rack parts in 3D view; no tap target under 24 px on phones, primary ones 44 px. |

### Who does what
- **Claude:** owns the design and this plan. It writes the acceptance checks into each task, reviews each commit within one watch round against the mock-up and the criteria above, and reruns the beginner route (wizard → export) at 1280 and 375 px after T-15 and after T-17. No code claims.
- **Codex:** T-14 → T-15 → T-16 → T-17 (A, B, C) → T-18, one at a time, claiming `app.js`, `index.html`, `ready.js`, `layout.js`, `tools/selftest.html` and the Node tests as needed, with a self-test check per fix.
- **Antigravity:** first finishes T-10 (already started), then T-3 (power inputs, which fill in the sourced values T-16 shows), then **T-19**: for every catalog mount that needs an add-on (PoE HAT, NVMe HAT, special supply), record it from the model page; list which Lab Rax models offer parts for 180 mm beds. Then T-10 continues.

Codex and Antigravity are separate apps and can't be messaged; the tasks are in REVIEW.md and announced in [AGENT_OVERLEG.md](AGENT_OVERLEG.md).

## What was tested, and what is still uncertain

**Tested in the real app** (1280 and 375 px unless noted):
- **First visit:** start card, Guide me → wizard (5 steps) → Create rack, at both widths.
- **Start empty:** search, add four devices, the "make it taller" question, keyboard move (ArrowUp), Remove, Undo (1280).
- **Explore the example:** select a part, read its panel; shopping list, Ready-to-build dialog, PDF and build pack generation, with the ZIP's file list, README, CSVs and rack file (1280).
- **Where bar:** all six positions in Flat and 3D; library contents per position, with and without a search term.
- **Side handles:** add, the profile picker, a bolted profile on a heat-set frame (the readiness warning appears with fresh scripts).
- **Full or invalid build:** shrinking 6U → 5U, the "Doesn't fit" tray, Place → grow question, Cancel.
- **Save, open, share:** Save rack file, Copy share link, the share link opened over an own rack, rack files that are valid, broken, have unknown parts, or come from a newer version.
- **Measured:** tap target sizes and contrast (both themes), plus DOM positions on the phone.

**Uncertain or not tested:**
- **Risk V-1, stale scripts after a deploy.** `index.html` loads scripts without a version in the URL. In this session `ready.js` came from the cache while `app.js` was revalidated. On GitHub Pages (about 10 minutes of caching) a returning visitor could get a new `app.js` with an old `ready.js`. Not tested on the live site.
- Dragging and 3D picking by mouse or touch; screen reader output; real file dialogs and download folders.
- The PDF's visual layout (only its page count and text were checked here).
- Whether Side handles replace or add to the base frame's own handles: the planner doesn't say, and it needs the model page (T-19).
- **R-22:** whether any 10-inch panel in the catalog can be printed on a 180 mm bed in parts. The planner says none fit; the advice to look for variants needs data (T-19).
