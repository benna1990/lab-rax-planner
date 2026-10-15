# UX findings — simulated walkthroughs

Date: 15 October 2026. These are **heuristic walkthroughs**, not user tests: no real users were observed. Each persona's tasks were run in the live app (fresh profile) or on `localhost:8000`, and judged against common usability heuristics (visibility of status, match with the real world, recognition over recall, error prevention, help).

Scoring per task: ✅ works without help · ⚠️ possible with effort or prior knowledge · ❌ not supported.

## First 10 seconds (all personas)

- The header says *"Plan your 3D-printed 10″ rack · Lab Rax and more"*. That conveys the subject, not the outcome (a rack you can actually build).
- The first screen shows an example rack in 3D, a 6-way Where bar, a search field, three tabs, 20 library groups and a long build column. That's 66 visible buttons at 1440 px.
- **Status signals contradict the example:** "Warm ≈ 39 °C" and "Short 10 / 9 ports" on the example's own build.

## Personas and tasks

| Task | Beginner (printer, no rack experience) | Homelab enthusiast (UniFi, Pi, mini PC) | Experienced builder | International user |
|---|---|---|---|---|
| Understand the purpose | ⚠️ subject is clear, outcome is not | ✅ | ✅ | ✅ |
| Know where to start | ❌ the example rack and the "Set up a rack" button compete; no start choice | ⚠️ finds Devices search | ✅ ignores the example and clears it | ⚠️ |
| Pick rack and printer | ⚠️ height is a stepper by the 3D view; frame type under settings; printer is inside the Print list | ⚠️ same | ✅ | ⚠️ country is inside the shopping list |
| Find a compatible part | ⚠️ search works; "needs 8U" and "≈" chips need explaining | ✅ Devices → model → mount | ✅ | ✅ |
| Device vs printed mount | ❌ one row shows the device name with the mount's label as a subtitle | ⚠️ | ✅ | ⚠️ |
| Place and rearrange | ⚠️ works, but dragging only in the Flat view; 3D is the default | ✅ (↑/↓, drag, undo) | ✅ | ✅ |
| Understand warnings | ⚠️ the new depth/overlap warnings explain themselves; cooling and port warnings use short codes ("Warm", "Short") | ⚠️ | ✅ | ⚠️ |
| What to print and buy | ⚠️ the Print list and Shopping list are good but sit far down a long column | ✅ | ✅ | ⚠️ shop links are searches per region |
| How to connect hardware | ❌ no per-device supply or cabling guidance; fans and LEDs without wiring help | ⚠️ PoE budget and ports help | ⚠️ | ❌ plug types and mains equipment not covered |
| Export a usable plan | ✅ PDF, build pack and share link in the header | ✅ | ✅ | ✅ |

## Recurring problems

1. **No orientation.** There's no step model, no progress, no "done". → Step bar plus Build readiness.
2. **Choice overload at the start.** Everything is visible at once. → A start screen and progressive disclosure: library groups closed, build sections collapsed until relevant.
3. **Status words without a reason.** "Warm", "Short", "≈", "needs 8U". → Every status needs a sentence that says why it matters and how to fix it.
4. **The wizard order fights the task.** It asks for colours first. → Hardware first.
5. **Phone.** Rack first, library 1,000 px lower, build 2,000 px lower; adding from the library gives feedback far from the finger. → Step navigation that jumps to the right area, and feedback near the action.

## Accessibility notes (from code and DOM, not a screen-reader test)

- Parts in the rack have `role="button"` with a descriptive `aria-label` (good); the Where bar and views use `aria-pressed` (good).
- 35 buttons are under 32 px in one dimension on a phone, below the commonly recommended 44 px (WCAG 2.5.5, AAA). Whether each meets the 24 px minimum (2.5.8, AA) was not measured.
- Status colours (heat chips, warnings) are always paired with text (good).
