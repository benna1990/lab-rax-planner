# Buying the right products

*Claude, 16 October 2026, from the owner's question. Finding R-36, tasks T-21 and T-22. Claims and replies go in [REVIEW.md](REVIEW.md).*

## R-36: Shop links are searches, so a beginner can buy the wrong thing (S2)

- **Actual:** every shopping row links to a shop search built from `hardware[].search`, such as "M6x10 button head screws ISO 7380". The results change from day to day and include near misses: the wrong length, a countersunk head, M5, a pack of 10. Only the row's `spec` text says what is right, and it reads like a footnote. When a shop doesn't carry the item, the row looks the same.
- **Expected:**
  - Every row first says **what exactly to buy**, independent of any shop, so the user can find it anywhere.
  - Then **where**: a product the maintainer checked against the spec, at each shop and market where one exists, or a search clearly labelled as a search.
- **Impact:** screws that don't fit, inserts too long for the 5.5 mm holes, an under-powered Pi supply.

## The approach

1. **The product comes first.** Each row shows:
   - the name;
   - the exact spec as a short list (thread × length, head, drive, material);
   - **"Check before you buy"** points: inserts no longer than 5 mm, a supply that gives 5.1 V 5 A over USB-C PD;
   - how many you need and the pack size;
   - a small drawing made from the spec, such as a button-head screw, an insert or a 40 mm fan. Never a shop photo.

   This part needs no shop and is in the PDF and the CSV too.
2. **Checked products where they exist.** The maintainer picks one exact product per shop and market that matches the spec, records the date, and the row links straight to it. Two rules:
   - the affiliate tag is added at runtime, as now, on the configured market only;
   - no prices are stored.
3. **Honest labels.** The row says either **"Checked product, 16 Oct 2026"** or **"Search, compare with the spec above"**. When the market has no checked product, the search is the fallback.
4. **Links that go dead.** A maintainer tool lists the checked links. A link found gone or changed is removed and the row falls back to search. Shops block scripted checks, so it's checked in a browser.

## T-21: Product rows and checked products → **Codex**, after T-20

**Code:**
- `catalog.json` `hardware[]` gets `check` (a list of text) and `picks`:

  ```json
  [{ "shop": "amazon", "market": "NL", "url": "https://www.amazon.nl/dp/B0…", "title": "…", "pack": 50, "checked": "2026-10-16" }]
  ```

  The URL is plain: no tag, no tracking.
- The validator:
  - keeps `picks` to the shop's own domain for that market;
  - rejects tracking parameters (the existing rule) and a pick without `checked`.
- `market.js` builds the link from the pick on its market. It adds the tag only where it already does, and otherwise falls back to search.
- The UI follows "The approach" above: the shopping list rows, the Ready-to-build dialog, `shopping-list.csv` (spec, check, link type, checked date) and the PDF.
- The drawings come from `mm`, the thread and the head in the spec. `shapes.js` already draws in mm.

**Done:**
- every row shows the spec and its check points without any shop;
- a row with a pick links to it and says "Checked product, date";
- a row without one says "Search";
- the validator rejects a pick on the wrong domain or with a tag;
- a self-test check covers both kinds of row.

## T-22: Find the checked products → **Antigravity**, after T-10 and T-3

For each of the 31 `hardware` entries, open amazon.nl and bol.com in the browser. Find **one** product per shop that matches the spec exactly: thread, length, head and drive, material where it's stated, and a pack size close to the need.

Write them to `docs/audit/shop-picks.json`:

```json
{ "id", "shop", "market", "url", "title", "pack", "matches": "which spec points the page confirms", "checked" }
```

**Rules:**
- Only list a product when its page confirms every spec point.
- No prices, no photos, and no tags or tracking in the URL.
- If nothing matches, write `"none found"`. That's useful too.

**The owner approves the list before Codex imports it,** since these links earn money and carry his name.
