# OpenAPI Events Page

Marketing/events site for OpenAPI events. Built with **Next.js 15** (App Router)
and **Tailwind CSS**, deployed to **both GitHub Pages (static) and Cloudflare
Workers (SSR via OpenNext)** from a single codebase.

## Requirements

- Node.js (see [`.node-version`](.node-version) — currently 22; `engines` allows ≥20)
- `npm ci` to install dependencies

## Development

```bash
npm run dev          # local dev server at http://localhost:3000
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test:e2e     # Playwright end-to-end tests
```

## Content: events & images

Each event is a `data/<slug>/event.yml` file (typed by `EventItem` in
[`data/events.ts`](data/events.ts)), bundled into the build — there is no CMS or
database. Images are **hosted in the repo** as optimized WebP, not hot-linked.

Two Claude Code skills automate this (see [`.claude/skills/`](.claude/skills/)):

- **`add-event`** — creates a new `data/<slug>/event.yml` and converts its images.
- **`convert-image`** — resizes/optimizes images to WebP via `npm run img`.

### Event data (one file per event)

Each event is its own file, **`data/<event-slug>/event.yml`**, discovered and
bundled at build time (so both deploy targets ship it; no runtime filesystem
access). It holds the listing fields plus optional detail-page data (`agenda`,
`sponsors`, `meta`) and nested `talks[]` for `/events/talks/<slug>` pages.

Listings are ordered **by date** by default (upcoming soonest-first, past
most-recent-first). To pin a specific order, list slugs in
[`data/events.order.yml`](data/events.order.yml) — it is the primary order
source; anything not listed falls back to date order.

### Image layout (per event)

Raw source images go in a **gitignored inbox**, one folder per event; the
converter writes optimized WebP under `public/img/`:

```
source-images/<event-slug>/        ← raw inbox (gitignored, never committed)
  cover.jpg                         ← event image — must be named cover.*
  frank-kilcommins.jpg              ← name each speaker file after the speaker (kebab-case)
  jane-doe.png
  gallery/                          ← optional event photos (any filenames)
    stage.jpg

public/img/events/<event-slug>/    ← committed output
  cover.webp
  speakers/frank-kilcommins.webp
  speakers/jane-doe.webp
  gallery/01.webp                   ← renumbered in sorted order
```

The raw filename becomes the slug (`frank-kilcommins.jpg` → `frank-kilcommins.webp`).

### Converting images

```bash
# Batch a whole event inbox (preferred)
npm run img -- --event <event-slug> --all

# A single image (local path or URL)
npm run img -- "<url-or-path>" --event <event-slug> --kind cover
npm run img -- "<url-or-path>" --event <event-slug> --kind avatar --name jane-doe
```

| `--kind`  | For                          | Output size | Path                                       |
| --------- | ---------------------------- | ----------- | ------------------------------------------ |
| `cover`   | event image (card/hero)      | width 1200  | `/img/events/<event>/cover.webp`           |
| `avatar`  | speaker photo (64px, square) | 320×320     | `/img/events/<event>/speakers/<name>.webp` |
| `gallery` | event photo gallery          | width 1600  | `/img/events/<event>/gallery/NN.webp`      |

Backed by [`scripts/convert-image.mjs`](scripts/convert-image.mjs) (`sharp`).
Images are never enlarged beyond their source resolution.

### Adding an event by hand

If not using the `add-event` skill, create `data/<slug>/event.yml` (one YAML
mapping, no leading `-` — it's one event per file; the folder name must equal
the `slug`):

```yaml
title: 'API Days Tokyo'
slug: api-days-tokyo # = folder name; used in the URL
event_date: 'October 14 — 15, 2026' # human string; em dash (—) for ranges
location: 'Tokyo International Forum, Japan'
type: 'Event' # Event | Conference | Masterclass
status: 'upcoming' # active (featured) | upcoming | finished
image: '/img/events/api-days-tokyo/cover.webp'
time_start: '09:00'
time_end: '17:00'
description: 'One-line summary.'
permalink: '/events/api-days-tokyo' # must be '/events/' + slug
speakers: # [] if none
  - name: Jane Doe
    position: 'Staff Engineer | Acme'
    photo: '/img/events/api-days-tokyo/speakers/jane-doe.webp'
tags: [event] # lowercase of type
```

Optional `agenda`, `sponsors`, `metaTitle`/`metaDescription`, and `talks[]` add
the detail page and per-talk pages — see the `add-event` skill for those shapes.

## Deployment

The same code targets two hosts; [`next.config.ts`](next.config.ts) branches on
the `CF_BUILD` env var.

### GitHub Pages — automatic

`npm run build` produces a static export to `./out` (with `basePath` for the repo
subpath). The [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
workflow builds and deploys this **on every push to `main`**.

### Cloudflare Workers — manual

`CF_BUILD=1` switches off the static export and builds an OpenNext Worker bundle
instead. Deploy is **manual** (not on every push):

```bash
npm run cf:build     # CF_BUILD=1 opennextjs-cloudflare build  → .open-next/
npm run cf:preview   # build + local preview
npm run cf:deploy    # build + deploy (needs Cloudflare credentials)
```

> **If deploying via Cloudflare's "Workers & Pages" Git integration**, set the
> dashboard **Build command** to `npm run cf:build` (not `npm run build` — that
> produces the static export and the Worker deploy will fail with
> "Could not find compiled Open Next config").

Config: [`wrangler.jsonc`](wrangler.jsonc), [`open-next.config.ts`](open-next.config.ts).
