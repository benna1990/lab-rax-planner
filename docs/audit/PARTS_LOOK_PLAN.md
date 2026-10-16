# Parts that look and fit like their models

*Claude, 16 October 2026. Tasks T-10 to T-12; claims and replies go in [REVIEW.md](REVIEW.md).*

## The problem

The owner found many parts drawn in the wrong place or the wrong shape. Example: **Lab Rax Side Handles Remix** (`mw1931511`, Blind Badger).
- **On the model page:** handles and corner pieces bolted to the **top corners on both sides**, sticking out sideways. The page has four print profiles: normal bolted, XL bolted, all options together, and one more.
- **In the planner:** one flat grip in the **middle of the side panel**, and no choice between normal and XL.

## Why it happens

1. **Guessed shapes.** Most entries were added from titles and search results. MakerWorld blocks our page reads. Each entry got one keyword (`"handles": "side"`), and `shapes.js` draws one generic picture per keyword. Nobody compared the drawing with the model.
   - Of 341 parts, 3 have an evidence record and none has a licence.
   - None of the 75 frame extras was checked.
2. **No options.** A model page with several print profiles is one entry. The catalog can't say "pick normal or XL", so the drawing, the print list and the PDF can't either.
3. **No "where it attaches".** Frame extras have no attachment point or size. The drawing code guesses one per keyword.

## Why not show the real model files instead

- **We may not store or ship them.** The licences and the project rule forbid redistributing them.
- **A 3MF is a print layout.** The pieces lie flat on plates, often with every profile at once. Even with the file, each piece needs numbers that say where it sits on the rack.

So the numbers are needed either way. "Load STL" (your own file, kept in your browser) stays as a way to check a part, and can later work for frame extras too.

## The approach

Every entry gets one **page record**. The planner draws from that record, and shows plainly when a drawing isn't checked yet.

1. **Read the page once, record everything** (T-10, Antigravity): licence, print profiles, where it attaches, stated sizes, hardware, and whether our drawing matches the photos. This also covers T-4 and T-5, so each page is opened only once.
2. **Options and attachment points in the catalog** (T-11, Codex):
   - you pick a print profile per part;
   - `shapes.js` draws frame extras from where they attach and their size, not from one guess per keyword;
   - parts that haven't been checked say so.
3. **Measure where the page gives no numbers** (T-12, owner and Codex): from the model file in `reference/`, which is never committed.

### Done, per entry
- The page record exists with `confidence: "page"`.
- The options are in the catalog.
- The drawing in `tools/looks.html` matches the photos.
- `evidence.look` is recorded.

Until then the part shows **"Approximate drawing, see the model page"**.

## T-10: Page records → **Antigravity**

The first batch is the **75 frame extras**: handles, feet, sides, tops, logos, corners, depth, joiners. Next come the parts in the example rack and in the wizard's suggestions, then the rest.

Write `docs/audit/model-pages.json`. Commit it in batches of about 20.

```json
{ "checked": "2026-10-16", "pages": [ {
  "id": "mw1931511", "url": "https://makerworld.com/en/models/1931511", "date": "2026-10-16",
  "license": "as the page states it",
  "profiles": [ { "name": "Only Normal Bolted Parts (Handles and corners)", "plates": 4, "prints": "what the profile prints, in words" } ],
  "attaches": "front-slot | rear-slot | top | bottom | side-panel | top-corners | bottom-corners | posts | inside | feet | wall | desk",
  "sides": "both | left | right | one",
  "sizes": { "u": null, "lengthMm": null, "outMm": null },
  "hardware": [ { "part": "M3x8 bolt", "qty": 8 } ],
  "fitsLabRax": "stated | not stated",
  "look": "ok | position | shape | size | options",
  "lookNote": "what the photos show and what our drawing gets wrong, in words",
  "confidence": "page"
} ] }
```

**Rules:**
- Fill in only what the page states.
- Leave out a number you can't find (`null`). Never guess sizes, polarity or quantities.
- Describe the photos in words. Never copy, trace or download the images or the model files.
- To judge `look`, compare the page photos with `tools/looks.html?ids=<id>&3d=1`.

**Done:** the batch is valid JSON, it's committed, and the entries are listed in REVIEW.md.

## T-11: Options, attachment points and look status → **Codex**

Starts after T-9 and the T-3 integration.

1. **Options.**
   - The catalog gets `"options": [{ "id", "name", "shape" (overrides), "note" }]`.
   - The part's panel has a picker.
   - The choice is saved per item as `opt`. Share links and rack files carry it as an optional field: format version 1 stays, and old files still load.
   - The print list, the shopping list and the PDF name the profile to print.
2. **Attachment points.**
   - Frame extras get `shape.at` (from `attaches`) and their stated or measured sizes.
   - `shapes.js` draws extras from `at` and the sizes.
   - Start with handles: top corners, both sides, normal and XL.
3. **Look status.**
   - `evidence.look` records whether the drawing was compared with the page.
   - Without it, the part's panel says "Approximate drawing, see the model page".
4. **Import.** Take only `confidence: "page"` records from `model-pages.json`, the same way as T-3. Licences, hardware and fit evidence come with them.
5. **Checks.**
   - The validator checks `options`, `at` and `evidence.look`.
   - A codec round trip covers an item with `opt`.
   - The self-test places a part with an option and checks the print list.
   - `tools/looks.html` shows every option.

## T-12: Measuring → **owner**, then **Codex**

For parts whose page gives no sizes, the owner downloads the model file into `reference/`, named by catalog id. Codex measures it with `tools/measure.mjs`, and extends it for frame extras with each piece's size and where it touches the frame. Only the numbers go into the catalog.

## T-13: Models missing from the catalog → **Antigravity**, after T-10

A MakerWorld search for "lab rax" on 16 October 2026 gave 446 models. 133 of them are in the catalog; 12 of the 50 most relevant are not. The other 313 are listed in [model-candidates.json](model-candidates.json), most relevant first. It's a list of candidates, not checked: further down, many results may not be Lab Rax add-ons.

For each candidate that is a rack part, write a page record in `model-pages.json` in the same format, with `"new": true` and a `"what"` line saying what it is. Skip the others, and list them in REVIEW.md with a reason. Codex adds the rack parts to the catalog with their licence. The validator requires a licence for every new entry.
