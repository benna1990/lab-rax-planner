# Catalog verification — current state and proposal

## Current state (computed from `catalog.json`, 15 October 2026)

| Measure | Count |
|---|---|
| Entries (panels, mounts, top mounts, extras) | 507 |
| Devices | 143 (142 with a size) |
| Height marked `estimated` | 220 |
| `labrax: true` (made for or tested in Lab Rax) | 72 |
| `fit` field | 19 |
| `licence` field | 0 |
| No `author` | 93 |
| `watts` given / of those `wattsEstimated` | 334 / 95 |
| `hardware` listed | 21 |
| Sources | 439 MakerWorld, 68 Printables |

**Measured so far** (with `tools/measure.mjs` and model files in the git-ignored `reference/` folder): the ½U keystone panel, the 1U vent, the 2U 7-SBC holder, the 2U 80 mm fan panel and the U7 Pro top mount (commit `9245d11`), plus the Lab Rax panel heights (`82a0227`). These are *measured from the model file*. That is a verified dimension of the model, not of a print, and not of the fit with a device.

**Gaps:**
- There's no field for *how* a number is known.
- `estimated` covers only the height.
- Device sizes don't say whether they come from a datasheet.
- Nothing records licences.
- Popularity and "Lab Rax" in a title are the only hints of compatibility.

## Verification states

Each state applies to **one claim**: height, depth, device fit, rack compatibility, power figure, or hardware list. It is never applied to a whole part.

| State | Meaning | Evidence required |
|---|---|---|
| **Verified** | The exact claim holds. | Method + date: measured from the model file, a test print, or a fit check with the device. |
| **Documented** | The creator or manufacturer states it; the fit isn't independently checked. | Link to the model page or datasheet. |
| **Community reported** | A builder reports it works. | An identifiable source (comment, make, post). |
| **Estimated** | Derived from assumptions (a photo, the title, a similar part). | A short note on the assumption. |
| **Unknown** | No information. | — |

A popular listing doesn't make a part Verified. A verified height says nothing about print quality or electrical fit.

## Schema proposal (backwards compatible)

Add an optional `evidence` object per entry. Old fields keep working and map onto it.

```json
"evidence": {
  "height": { "state": "verified", "method": "measured from model file", "date": "2026-10-15" },
  "fit":    { "state": "documented", "source": "https://makerworld.com/en/models/1175026" },
  "power":  { "state": "documented", "source": "manufacturer datasheet URL" }
},
"license": "CC BY-NC-SA 4.0"
```

Mapping of today's fields: `estimated: true` → `height.state = "estimated"`, and no `estimated` → `height.state = "documented"` (taken from the model page). `wattsEstimated` → `power.state = "estimated"`. `labrax: true` with a measured entry → `fit.state = "verified"`, otherwise `"documented"`. Measured entries (the list above) → `height.state = "verified"`, `method: "measured from model file"`.

## Contribution and review

1. A contributor adds an entry with a source link and fills `evidence` honestly (a template in `CONTRIBUTING.md`).
2. `tools/validate.mjs` checks the schema, requires a source for every state above *Estimated*, and requires a licence for new entries.
3. A reviewer checks the link, and the measurement when a model file is available (`tools/measure.mjs`).
4. Never commit model files or anything traced from them; only numbers.
