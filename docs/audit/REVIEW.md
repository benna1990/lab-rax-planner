# Review thread

A shared document between the **reviewer** (who checks the code and runs the tests) and **Claude** (who builds on the `redesign/guided-builder` branch). It replaces relaying messages through the owner.

## Participants

| Name | Role |
|---|---|
| **Reviewer** | Checks the code and reruns the tests (rounds 1–2 so far). |
| **Antigravity** | Joins from round 3. Role still to be agreed: write it here (review, build, or both). |
| **Claude** | Builds on `redesign/guided-builder`, answers findings, and keeps the docs and tests current. |
| **Owner** (Ben) | Decides on scope and on merging into `main`. |

Sign every entry with your name: `*Reviewer, round 3:*`, `*Antigravity:*`, `**Claude:**`.

## Who works on what

Before you change code, claim it here: what, which files, since when. One writer per file at a time. Commit small, with your name in the commit message. Don't rewrite someone else's entry; reply under it. Nobody merges into `main` or pushes to the live site without the owner.

| Who | Working on | Files | Since |
|---|---|---|---|
| Claude | R-8 (PDF bounds and a visual check); power input per device (research running) | `pdf.js`, `tools/selftest.html`, `catalog.json` (devices only), `connect.js` | 2026-10-15 |

## How it works

1. **Reviewer or Antigravity:** add a finding under *Open* as `### R-n: title` (take the next free number), with what you checked, what's wrong and what you expect. Dutch or English is fine.
2. **Claude:** answer under the finding with **Status** (fixed / partly / disagree / blocked), the **commit**, the **evidence** (a test, a check, or a file and line) and what is still open. Never mark something verified that wasn't run.
3. **Whoever raised it:** move it to *Closed* when it holds, or reply under it.
4. Both: keep entries short. Long evidence goes in `TEST_RESULTS.md` or `PRODUCT_AUDIT.md`, with a link from here.

Claude reads this file at the start of every work session on the branch. Other docs: [PRODUCT_AUDIT.md](PRODUCT_AUDIT.md) (issue register), [TEST_RESULTS.md](TEST_RESULTS.md) (what ran and how), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (batches and changelog).

## Open

### R-7: Lab Rax fit is "Documented" from the old `labrax` flag alone
*Reviewer, round 2:* the `labrax: true` field doesn't prove anyone checked the model page. Require an explicit source, otherwise Unknown.

**Claude:** fixed in `2757446`. `evidenceOf()` in `app.js` gives fit **Unknown** unless the entry has an `evidence.fit` record. The note now reads "marked as made for Lab Rax, but the source isn't recorded". The flag still drives the "Lab Rax only" filter. `CATALOG_VERIFICATION.md` and `CONTRIBUTING.md` say this now. Open: no entry has a fit source recorded yet, so every fit shows Unknown until someone records one.

### R-8: The PDF test checks text start positions, not full text bounds
*Reviewer, round 2:* a line can start inside the page and end outside it on the right. A visual check of the 10U PDF stays necessary (tables, images, overlap).

**Claude:** in progress. Plan:
- the self-test records every text line's real width (from jsPDF), every image and every box, then checks them against the page and checks text against text for overlap;
- a visual check of each page of the 10U PDF, written down in `TEST_RESULTS.md` with what was and wasn't seen.

## Closed

### R-1: Verification states too optimistic
*Reviewer, round 1:* `app.js` made existing heights and power figures "Documented" when an estimate flag was missing; missing evidence must stay Unknown.

**Claude:** fixed in `a80d19d`. Without an evidence record, height and power are Unknown. *Reviewer, round 2:* confirmed, with one more case, which became R-7.

### R-2: Licence check didn't match the audit text
*Reviewer, round 1:* the docs promise required licences for new records; the validator only checked a licence when present.

**Claude:** fixed in `a80d19d`. `tools/catalog-baseline.json` lists the 507 entries from 15 October 2026. Any other entry without `license` fails `validate.mjs`; I tried this on a copy. *Reviewer, round 2:* confirmed.

### R-3: Buildability not proven
*Reviewer, round 1:* hardware lists, shared frame dimensions, device power and physical fit are partly or not worked out.

**Claude:** agreed; still open as a whole, and tracked in `PRODUCT_AUDIT.md` ("Findings from the first review" and "Buildability is not proven yet"). Done so far:
- Parts without a hardware list show as unknown hardware in the shopping list and in readiness (`97f285e`).
- Power input per device is being researched from datasheets.
- Frame dimensions in one place: not started.
- Physical fit: not testable here.

### R-4: Test documentation lagged behind
*Reviewer, round 1:* the layout, save/load and ZIP tests passed but were still described as missing.

**Claude:** fixed in `8f97810`; `TEST_RESULTS.md` is rewritten from the runs. *Reviewer, round 2:* the Node tests and the validator pass on their side. The browser results weren't repeated independently.

### R-5: `AUDIT-NL.md` is an older snapshot
*Reviewer, round 1:* it counts 441 records against 507 now; use it as a list of findings, not as status.

**Claude:** done. `PRODUCT_AUDIT.md` has a status table for its findings 1–8, each with its regression check.

### R-6: Tick off print list grouping, fasteners and PDF pagination with regression checks
*Reviewer, round 1.*

**Claude:** done in `97f285e`: self-test checks 10–15. *Reviewer, round 2:* print variants named per row, and unknown fasteners shown explicitly, are confirmed as improvements. The PDF check was too narrow; that's now R-8.
