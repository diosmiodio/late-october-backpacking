# Design Spec — Late-October Backpacking Site

**Date:** 2026-06-22
**Status:** Approved (build in progress)

## Goal

Turn `late_october_backpacking.json` (30 curated US backpacking destinations + 1 ruled-out, with bookability, routes, pros/cons, tradeoffs, official links) into a polished, mobile-first static website. Enrich the data with real photos and useful links, and deploy a live site to GitHub Pages.

## Approach

Vanilla HTML/CSS/JS with a small **Node build script** (no framework). The script reads enriched JSON and emits pre-rendered static HTML (fast first paint, SEO-friendly, works without JS). Vanilla JS layers on filtering/search/sort, a deep-linkable detail view, and a Leaflet map. No runtime dependencies installed in CI — Leaflet loads via CDN; the build uses only Node built-ins.

Rejected: static-site generators (Astro/11ty) and React SPA — unnecessary tooling/overhead for a single static dataset.

## Site structure

- **Hero** — title, "why late October" rationale, daylight/pack-warm warning (from `meta`).
- **Sticky filter bar** — filter by bookability / region / difficulty; free-text search (name + state); sort (bookability → name → nights).
- **Bookability legend** — color-coded: green = open access, blue = easy now, amber = competitive, gray = ruled out (from `bookability_legend`).
- **Overview map** — Leaflet + OpenStreetMap tiles (no API key), markers by approximate coordinates, color-coded by bookability. Labeled "approximate."
- **Card grid** — responsive 1→2→3 columns. Card: photo, badge, name, state/region, difficulty + nights chips, one-line hook.
- **Detail view** — deep-linkable (`#destination-id`), full-screen on mobile / dialog on desktop: pros, cons, tradeoff, route, terrain, bookability note, plan-it summary, link row, photo credit.
- **General tips** section (from `general_tips`).
- **Ruled-out** card — Havasupai ("considered but not viable last-minute").

## Visual direction

Outdoorsy autumn palette (golds, rust, canyon red, deep pine), clean modern typography, large imagery, generous spacing, subtle motion. Mobile-first, accessible (keyboard nav, focus management, sufficient contrast, reduced-motion respect), fast (lazy-loaded images).

## Data enrichment (grounded — no invented trail facts)

Per destination, add:
- **image** — real, freely-licensed photo (Wikimedia Commons / NPS public domain) downloaded into the repo, with `credit` (author), `license`, `license_url`, `source_url` recorded and displayed.
- **coordinates** — approximate trailhead/area lat-lon (powers map + map/weather links). Labeled approximate.
- **links** — constructed from reliable URLs:
  - `official` (from source data)
  - `map` — Google Maps at coordinates
  - `weather` — NWS point forecast at coordinates
  - `recreation` — recreation.gov search (only where booking applies)
  - `alltrails` — AllTrails route search
- **plan_it** — scannable summary derived from existing fields: bookability action (from legend), water strategy (derived from pros/cons), key risk (derived), nights, route. Re-surfaces existing data; does not fabricate.

Original source preserved as `data/source.json`. Enriched output: `data/destinations.json`.

## Repo & deployment

- Public GitHub repo `late-october-backpacking` under account `diosmiodio`.
- `npm run build` → `dist/` (index.html, styles, app.js, images).
- GitHub Actions workflow builds and deploys `dist/` to GitHub Pages → live URL.
- README documents the data source, photo credits/licenses, build/run steps, and an "informational only — verify permits & closures officially" disclaimer.

## Scope boundaries (YAGNI)

No CMS, backend, accounts, live permit-availability API, or build-time weather fetching. Links handle the dynamic bits.

## Project layout

```
late-october-backpacking/
  data/source.json              # original dataset (unmodified)
  data/destinations.json        # generated enriched dataset
  assets/images/                # downloaded photos + credits.json
  scripts/fetch-images.mjs      # Commons search + download + attribution
  scripts/enrichment-data.mjs   # coordinates + per-destination overrides
  scripts/enrich.mjs            # source -> enriched JSON
  scripts/build.mjs             # enriched JSON -> dist/
  src/template.mjs              # HTML generation
  src/styles.css                # styles
  src/app.js                    # filter/search/sort/detail/map
  .github/workflows/deploy.yml  # Pages deploy
  README.md
```
