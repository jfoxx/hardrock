# Block Library

How to create **library examples** for every block in this project so authors can
browse, preview, and copy blocks directly from the AEM Sidekick / DA Library.

A "library example" is just authored content: a document that contains one or more
ready-made instances of a block. The Library plugin renders each example and lets an
author copy it into their page. Keeping an example per block (and per variant) is the
fastest way to keep authors productive and blocks used consistently.

---

## How the library works

1. **Example documents** — For each block you create a document (in DA / Google Drive /
   SharePoint) that holds example instance(s) of that block. Convention here:
   `/block-library/<block-name>` (e.g. `/block-library/cards`).
2. **Labels** — Each example is a section ending in a **Section Metadata** block with a
   `name` (the label shown in the Library) and optional `description` / `searchtags`.
3. **Index** — A `library.json` spreadsheet with a `blocks` sheet lists every block and
   the path to its example document.
4. **Registration** — The Library is pointed at `library.json` (Sidekick project config
   or DA config). Authors then open the Library and copy examples.

> The **content convention** below is stable across Sidekick and DA. The **registration**
> step differs slightly between the two — see [Register the library](#register-the-library)
> and verify against current docs (`/plugin marketplace add adobe/skills` → `docs-search`).

---

## Authoring an example (the pattern)

Every example follows the same shape inside the example document:

1. Add the block by creating a table whose **first row/cell is the block name**
   (include the variant in parentheses, e.g. `Cards (feature)`).
2. Fill in the block's rows/cells (see per-block recipes below).
3. Immediately after the block, add a **Section Metadata** block:

   | Section Metadata |            |
   | ---------------- | ---------- |
   | name             | Cards      |
   | description      | Image + title + description cards |
   | searchtags       | cards, grid, promo |

4. Repeat for each variant, one per section, so each shows up as its own copyable entry.

**Tips**

- Put **one example per section** so each gets its own Library card.
- Use realistic copy and images — authors copy what they see.
- Keep the example self-contained (no dependency on page-level metadata) unless the block
  requires it (the feed-driven blocks below do).

---

## `library.json`

Create a spreadsheet named `library.json` with a sheet named `blocks`:

| name              | path                                   |
| ----------------- | -------------------------------------- |
| Cards             | /block-library/cards                   |
| Cards (event)     | /block-library/cards-event             |
| Carousel          | /block-library/carousel                |
| Columns           | /block-library/columns                 |
| Hero              | /block-library/hero                    |
| Events            | /block-library/events                  |
| Calendar of Events| /block-library/calendar-of-events      |
| Offers            | /block-library/offers                  |
| Fragment          | /block-library/fragment                |

`name` is the display name in the Library; `path` is the (preview/published) path of the
example document. Preview and publish both `library.json` and every `/block-library/*`
document.

---

## Register the library

**Sidekick** — add a `library` plugin to the project config (`tools/sidekick/config.json`
or the sidekick config) pointing at the published `library.json`, e.g.:

```json
{
  "plugins": [
    {
      "id": "library",
      "title": "Library",
      "environments": ["edit"],
      "url": "https://main--hardrock--jfoxx.aem.page/tools/sidekick/library.html",
      "includePaths": ["**.docx**"]
    }
  ]
}
```

**DA (da.live)** — add the block library to the DA project config `library` sheet so it
shows in the DA Library panel alongside custom plugins (like `tools/promo-picker`). Point
it at the same `library.json`.

> Confirm the exact config keys for your Sidekick/DA version with the `docs-search` skill
> before shipping — the content above (example docs + `library.json`) is what matters and
> does not change.

---

## Per-block recipes

Authoring model for every block in `blocks/`. Build one example section per row below
(add a variant example wherever a **Variant** is listed). Read the block's source before
authoring if in doubt — markup comes from the backend.

### cards
- **Purpose:** grid of image + text cards.
- **Structure:** one row per card; each row has two cells — **image** | **text** (heading,
  description, optional CTA link).
- **Variant:** `Cards (feature)` — larger/feature treatment.

### cards-event
- **Purpose:** event listing cards (image + title + date/time + CTA). Base block: `cards`.
- **Structure:** one row per event — **image** | **body** (title, date/time line, CTA).
- Authored content (not feed-driven) — good for hand-curated event rows.

### carousel
- **Purpose:** slideshow. Each row is a slide.
- **Structure:** one row per slide; each slide has **image** | **content** (heading, text,
  CTA).
- **Variant:** `Carousel (hero)` — full-bleed hero with bottom-aligned caption. On the
  homepage this variant **auto-advances every 5s**, pauses on hover, and stops once the
  user clicks the arrows/dots.

### columns
- **Purpose:** side-by-side content columns.
- **Structure:** one row; each cell is a column (text and/or image).
- **Variant:** `Columns (navbar)` — the navbar column layout used during import.

### hero
- **Purpose:** page hero (full-bleed image behind an H1).
- **Structure:** an image plus an `H1` (authored as default content in a hero section, or
  as a `Hero` block). As the first section it sits under the floating header; give it a
  short heading and a background image.

### events
- **Purpose:** compact upcoming-events teaser (e.g. homepage). **Feed-driven.**
- **Structure:** a config block — a row with **`limit`** | **`3`** (number of cards).
  Optional **`source`** row to override the feed.
- **Data:** reads `/daytona-beach/calendar-of-events/events-index.json`, shows the soonest
  upcoming events, Details → `…/calendar-of-events/?event=<slug>`.
- **Example note:** the Library example needs the feed to exist to render cards.

### calendar-of-events
- **Purpose:** full calendar page — list + single-event detail + Date/Category filters.
  **Feed-driven / URL-param driven.**
- **Structure:** usually an empty block (self-configures). Optional config rows: **`source`**
  (feed override), **`limit`** (cap the list).
- **Params (on the page):** `?event=<slug>` (detail), `?date=M/D/YYYY` (that month),
  `?category=<name>`. Date filter options are built from the feed; Category populates once
  events carry a `category` column.

### offers
- **Purpose:** promotional offer cards with a "More Info" modal. **Feed-driven.**
- **Structure:** one row per offer, each cell holds a **promo code** (e.g. `FLGAR`). **Bold
  a code** (`**FLGAR**`) to mark that offer as *Featured*.
- **Data:** matches codes to `/daytona-beach/offers/offers.json` (`promo` column) and
  renders image + title + summary; **Book Now** → Synxis with `&promo=<code>`; **More Info**
  opens a modal with the full details.
- **Tooling:** authors can find codes with the **Promo Picker** DA app
  (`tools/promo-picker/`).

### fragment
- **Purpose:** reuse a shared content fragment.
- **Structure:** a link to a `/fragments/...` path. Auto-blocking replaces the link with
  the fragment's content. (This is the only cross-block import allowed in code.)

### widget
- **Purpose:** embed a widget from `/widgets/...`.
- **Structure:** a link to a `/widgets/<path>/<name>.html`. Auto-blocking turns qualifying
  links into a widget block that loads the widget's html/css/js.

### header & footer (not copy-paste library items)
These are **auto-blocks** built from page metadata, not placed in the page body, so they
don't belong in the copyable library. Document their configuration instead:
- **header** — reads the `nav` metadata (the section's nav folder, e.g. `/daytona-beach/nav`)
  and loads `<folder>/header`.
- **footer** — reads the `nav` metadata and loads `<folder>/footer` (falls back to the
  site-root `/footer`).

---

## Section-level features to demonstrate

Blocks live inside sections, and several **Section Metadata** options change how a section
renders. Include example sections that show these, so authors discover them:

- **Style** — `light`, `shaded`, `accent`, `dark`; plus **`background: purple`**.
- **Align** — `center` → `data-align="center"` centers the section's default content.
- **Animate** — `slide-up`, `slide-down`, `drop-in` → the section reveals on scroll
  (respects `prefers-reduced-motion`).

Example Section Metadata:

| Section Metadata |          |
| ---------------- | -------- |
| Style            | shaded   |
| Align            | center   |
| Animate          | slide-up |

---

## Checklist for adding a new block to the library

- [ ] Create `/block-library/<block-name>` with one section per example (base + variants).
- [ ] End each example section with a **Section Metadata** `name` (and `description` /
      `searchtags`).
- [ ] Add a row to the `blocks` sheet in `library.json` (`name`, `path`).
- [ ] For feed-driven blocks (events, calendar-of-events, offers), make sure the feed is
      published so the example renders.
- [ ] **Preview and publish** the example doc and `library.json`.
- [ ] Open the Library in Sidekick/DA and confirm the block appears and copies correctly.
