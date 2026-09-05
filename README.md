# OpenAPI Events Page

Marketing/events site for OpenAPI events. Built with **Next.js 16** (App Router)
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

The site is Safari/iOS-first, so [`playwright.config.ts`](playwright.config.ts)
also targets WebKit at desktop, iPhone 14 Pro, iPhone 17 Pro Max, and iPad Pro 11.
Playwright's WebKit build links against `libicu74` and `libflite1`, which
Arch-family distros don't ship and `playwright install-deps` can't install (it
only knows `apt`), so **the WebKit projects are enabled only under `CI`** — or
locally with `PLAYWRIGHT_ALL=1 npm run test:e2e` on a host that can run them.
Everywhere else the same command runs the `chromium-desktop` project alone, so it
stays green instead of reporting failures nobody can fix locally. Browsers come
from `npx playwright install`.

Two generators run automatically before `dev` / `build` / `cf:build`, and can be
run on their own:

```bash
npm run speakers     # data/speakers/image/ -> public/, validates slugs, rewrites SPEAKERS.md
npm run covers       # data/<year>/<slug>/images/cover* -> public/, checks each event.yaml `image:`
```

Everything they write into `public/img/` is a **gitignored build artifact**; the
committed source of truth is under `data/`. The one committed output is
[`SPEAKERS.md`](SPEAKERS.md), which is documentation rather than build input.

## Content: events & images

Each event is a `data/<year>/<event-slug>/event.yaml` file (typed by `EventItem`
in [`src/lib/events.ts`](src/lib/events.ts)), bundled into the build — there is no
CMS or database. Images are **hosted in the repo**, not hot-linked.

Two Claude Code skills automate this (see [`.claude/skills/`](.claude/skills/)):

- **`add-event`** — creates a new `data/<year>/<event-slug>/event.yaml`, registers
  its speakers, and converts its images.
- **`convert-image`** — resizes/optimizes images to WebP via `npm run img`.

### Event data (one file per event)

Each event is its own file, **`data/<year>/<event-slug>/event.yaml`**, discovered
and bundled at build time (so both deploy targets ship it; no runtime filesystem
access). The folder name must equal the event's `slug`, and the year folder is
the year in its `event_date`. The file holds the listing fields plus optional
detail-page data (`agenda`, `sponsors`, `metaTitle`/`metaDescription`) and nested
`talks[]` for `/events/talks/<slug>` pages.

Listings are ordered **by date** by default (upcoming soonest-first, past
most-recent-first). To pin a specific order, list slugs in
[`data/events.order.yml`](data/events.order.yml) — it is the primary order
source; anything not listed falls back to date order.

### Speakers (global registry, referenced by slug)

Speakers are **not** written inline. Each has one definition in
[`data/speakers/speakers.yaml`](data/speakers/speakers.yaml), keyed by `slug`, and
events reference them by slug; [`src/lib/speakers.ts`](src/lib/speakers.ts)
rehydrates a slug into the `{name, position, photo}` shape the UI renders.

```yaml
# data/speakers/speakers.yaml
- slug: frank-kilcommins
  name: Frank Kilcommins
  role: Head of Enterprise Architecture
  company: Axtic
  image: frank-kilcommins.webp # file in data/speakers/image/, or a full URL
```

`name` / `image` / `description` are **identity** — edit once, changes everywhere.
`role` / `company` are **affiliation**, only true as of a given event, so when an
event finishes its titles are snapshotted into
`data/<year>/<slug>/speakers/speakers.yaml`:

```bash
npm run speakers -- --freeze <event-slug>   # the just-finished event
npm run speakers -- --freeze                # every finished event (write-once)
```

Freeze is **write-once** and captures whatever the registry says *now* — run it
while the titles are still accurate. A plain `npm run speakers` prints a reminder
listing any finished event that still has un-frozen titles. That same per-event
file is also the manual override mechanism: present fields win, missing fields
fall back to the global entry.

`npm run speakers` **fails the build** if an event references a slug that isn't in
the registry. Speakers with no `image` fall back to a neutral placeholder —
`/img/placeholder_light.svg`, swapped for `placeholder_dark.svg` under
`[data-theme='dark']` by the `.avatar-placeholder` rule in `app/globals.css`.

### Image layout

Raw source images go in a **gitignored inbox**, one folder per event; the
converter writes optimized WebP into `data/`, and the generators publish copies
into `public/img/`:

```
source-images/<event-slug>/        ← raw inbox (gitignored, never committed)
  cover.jpg                         ← event image — must be named cover.*
  frank-kilcommins.jpg              ← name each speaker file after the speaker (kebab-case = slug)
  gallery/                          ← optional event photos (any filenames)
    stage.jpg

data/<year>/<event-slug>/images/cover.webp     ← committed source of truth
data/speakers/image/<slug>.webp                ← committed source of truth
public/img/events/<event-slug>/cover.webp      ← published by `npm run covers`  (gitignored)
public/img/speakers/<slug>.webp                ← published by `npm run speakers` (gitignored)
```

The raw filename becomes the slug (`frank-kilcommins.jpg` → `frank-kilcommins`).

A cover is any file named `cover*` in an event's `images/` folder; the descriptive
suffix names the landmark (`cover-olympic-stadium.jpg`) and several events
legitimately reuse the same photo. `npm run covers` publishes it to
`/img/events/<slug>/cover.<ext>`, and the event's `image:` field must name that
path — the script fails the build if the two disagree, in either direction. An
event with no cover yet points `image:` somewhere else, e.g. `/img/background.jpg`.
`npm run covers:export` collects every cover into a flat `covers-export/` folder
keyed by event, for review or handoff.

> Never hand-place a cover under `public/img/events/` — `npm run covers` rebuilds
> that folder from `data/` on every dev/build and deletes anything it did not
> publish.

### Converting images

```bash
# Batch a whole event inbox (preferred)
npm run img -- --event <event-slug> --all [--year <YYYY>]

# A single image (local path or URL)
npm run img -- "<url-or-path>" --event <event-slug> --kind cover [--year <YYYY>]
npm run img -- "<url-or-path>" --kind avatar --name jane-doe
```

| `--kind`  | For                          | Output size | Path                                        |
| --------- | ---------------------------- | ----------- | ------------------------------------------- |
| `cover`   | event image (card/hero)      | width 1200  | `data/<year>/<event>/images/cover.webp`     |
| `avatar`  | speaker photo (64px, square) | 320×320     | `data/speakers/image/<slug>.webp`           |
| `gallery` | event photo gallery          | width 1600  | `public/img/events/<event>/gallery/NN.webp` |

`--year` is only needed when converting a cover before its `event.yaml` exists;
otherwise the year is read from the event.

> **Gallery is not wired up yet.** `--kind gallery` writes the files, but no page
> reads them — the homepage and every event detail page render the same fixed
> list in [`src/lib/galleryPhotos.ts`](src/lib/galleryPhotos.ts).

Backed by [`scripts/convert-image.mjs`](scripts/convert-image.mjs) (`sharp`).
Images are never enlarged beyond their source resolution.

### Adding an event by hand

If not using the `add-event` skill, create `data/<year>/<slug>/event.yaml` (one
YAML mapping, no leading `-` — it's one event per file; the folder name must equal
the `slug`, and the year folder must match the year in `event_date`):

```yaml
title: 'API Days Tokyo'
slug: api-days-tokyo # = folder name; used in the URL
event_date: 'October 14 — 15, 2026' # human string; em dash (—) for ranges
location: 'Tokyo International Forum, Japan'
type: 'Event' # Event | Conference | Masterclass
status: 'upcoming' # active (featured) | upcoming | finished
image: '/img/events/api-days-tokyo/cover.jpg' # = the published cover; see Content: events & images
time_start: '09:00'
time_end: '17:00'
description: 'One-line summary.'
permalink: '/events/api-days-tokyo' # must be '/events/' + slug
speakers: [frank-kilcommins] # slugs from data/speakers/speakers.yaml; [] if none
tags: [event] # lowercase of type
```

Speakers are slugs, never inline objects — an inline `{name, position, photo}`
throws at build time in `resolveSpeaker`. Register the speaker in
`data/speakers/speakers.yaml` first, then run `npm run speakers`.

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
instead. Deploy is **manual** (not on every push) — either from the Actions tab
via [`.github/workflows/deploy-cloudflare.yml`](.github/workflows/deploy-cloudflare.yml)
(`workflow_dispatch`, needs the `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`
secrets), or locally:

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
