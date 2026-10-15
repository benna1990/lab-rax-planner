# Test results

## Automated (run on 15 October 2026, branch `redesign/guided-builder`)

| Check | Result |
|---|---|
| `node tools/validate.mjs` | catalog.json valid: 507 parts, mounts and extras |
| `node --check` on all 12 scripts | pass |
| `tools/test-estimate.mjs` | pass |
| `tools/test-market.mjs` | pass |
| `tools/test-power.mjs` | pass |
| `tools/test-printers.mjs` | pass (4000 random fits against a brute-force search) |
| `tools/test-ready.mjs` (new) | pass: complete, empty, broken and warm builds; every warning has a fix |

## Browser walkthroughs (localhost:8000, Chromium in the Claude desktop browser pane)

| Scenario | Result |
|---|---|
| First visit (empty `localStorage`) | The start screen shows four choices over the rack; the step bar is visible |
| The new example build | Passes its own checks: cooling ≈ 31 °C, power and ports OK. Only "pick your printer" is open (a choice, not a problem) |
| Start empty | Empty 5U rack; readiness shows "Add your hardware" and "Pick your 3D printer"; the search field gets focus; Undo works |
| Adding two ½U parts | The second goes to a free U on its own (no overlap) |
| Forced ½U overlap | A warning at the top of readiness; step 2 turns red; "Show" switches to the Flat view and selects the part, with its "Move it to a free spot" action |
| Step bar 3 and 5 | Open and scroll to Power & network and the Print list |
| Console errors | none |

## Not tested

Real users; a screen reader; a physical phone (touch was emulated at 375 × 812 for the audit only); Safari and Firefox.
