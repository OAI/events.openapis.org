---
name: convert-image
description: Convert an event cover, speaker avatar, or gallery photo to the site's best-fit size and WebP. Covers and speaker avatars are saved as the committed source of truth under data/ (covers per-event in data/<year>/<event-slug>/images/, avatars in data/speakers/image/) and published into public/ by `npm run covers` / `npm run speakers`. Use when adding or updating event images, speaker photos, or gallery shots, or when asked to optimize/resize/host an image locally.
---

# Convert images for the OpenAPI events site

Resizes images to the right dimensions for where they're used, converts to WebP,
and writes them to the right place. Accepts a **local file path or a remote URL**
(it downloads URLs). Backed by `scripts/convert-image.mjs` (uses `sharp`).

## Where images live

**Everything committed lives under `data/`.** Covers and speaker avatars are the
source of truth there; the copies under `public/img/` are gitignored build
artifacts, materialized by `npm run covers` and `npm run speakers` (both wired to
`predev` / `prebuild` / `precf:build`).

> Do **not** hand-place a cover under `public/img/events/`. `npm run covers`
> rebuilds that folder from `data/` on every dev/build and **deletes** any
> `cover.*` it did not publish, so the file would vanish and was never committed
> anyway.

```
source-images/<event-slug>/        ← raw inbox (gitignored, never committed)
  cover.jpg                         ← the event image (must be named cover.*)
  frank-kilcommins.jpg              ← name each speaker file after the speaker (kebab-case = slug)
  gallery/                          ← optional event photos
    anything.jpg

data/<year>/<event-slug>/images/cover.webp         ← event cover (committed)
data/speakers/image/<slug>.webp                    ← speaker avatar (global source of truth)
data/<year>/<event>/speakers/image/<slug>.webp     ← per-event override avatar (--override)
public/img/events/<event-slug>/gallery/01.webp     ← committed (renumbered in sorted order)
```

**Naming convention:** a speaker's raw filename becomes their **slug**
(`frank-kilcommins.jpg` → slug `frank-kilcommins`). Name the event image `cover.*`.

`npm run covers` only picks up files matching `cover*` in an event's `images/`
folder, so `--name` on a cover is a **descriptive suffix**, not a replacement:
`--name "Heidelberg Castle"` writes `cover-heidelberg-castle.webp`, matching the
convention already in `data/` (`cover-london.jpg`, `cover-olympic-stadium.jpg`).
If a folder holds several `cover*` files, the alphabetically first one wins and
the script warns.

### `--year`

Cover and `--override` conversions need to know which `data/<year>/` folder the
event lives in. The script reads it from the event's existing `event.yaml`; pass
`--year <YYYY>` to convert images **before** that file exists.

## Usage

### Batch a whole event inbox (preferred)

Drop everything into `source-images/<event-slug>/`, then:

```bash
npm run img -- --event <event-slug> --all [--year <YYYY>]
```

Converts `cover.*` → `data/<year>/<event>/images/cover.webp`, every other
top-level image → a **global** speaker avatar in `data/speakers/image/`, and any
`gallery/*` → numbered gallery images. Afterwards add the speakers to
`data/speakers/speakers.yaml`, then run `npm run speakers` and `npm run covers`.

### Single image (path or URL)

```bash
# Global speaker avatar (the common case — no --event needed):
npm run img -- <input> --kind avatar --name <speaker-slug>

# Event cover:
npm run img -- <input> --event <event-slug> --kind cover [--name <landmark>] [--year <YYYY>]

# Event gallery:
npm run img -- <input> --event <event-slug> --kind gallery [--name <slug>]

# Per-event override avatar (rare — a global speaker with a different photo here):
npm run img -- <input> --event <event-slug> --kind avatar --name <speaker-slug> --override
```

- `<input>` — local path or `https://…` URL.
- `--event` — event slug. **Required** for `cover`/`gallery` and `--override`;
  omitted for a global avatar.
- `--kind` — `cover` (event image), `avatar` (speaker), or `gallery`.
- `--name` — output slug. For `avatar` pass the speaker slug; for `cover` it
  becomes a `cover-<name>` suffix.
- `--year` — 4-digit year, for `cover`/`--override` before the `event.yaml` exists.
- `--all`, `--override` — boolean flags, position-independent.

Unknown arguments and value flags missing a value are rejected with an error
rather than silently ignored.

The script prints where the file landed and a hint on how to reference it
(covers: `npm run covers`; avatars: set `image:` in a `speakers.yaml`, then
`npm run speakers`).

## Sizes

| `--kind`  | Used for                       | Output                  | Path                                          |
| --------- | ------------------------------ | ----------------------- | --------------------------------------------- |
| `cover`   | event `image` (card/hero)      | width 1200, aspect kept | `data/<year>/<event>/images/cover.webp`        |
| `avatar`  | speaker `image` (64px, square) | 320×320, center-cropped | `data/speakers/image/<slug>.webp` (global)     |
| `gallery` | event photo gallery / lightbox | width 1600, aspect kept | `public/img/events/<event>/gallery/NN.webp`    |

Images are never enlarged beyond their source resolution.

> **Gallery is not wired up yet.** `--kind gallery` converts and writes the files,
> but no page reads `public/img/events/<event>/gallery/`. Both the homepage and
> every event detail page render the same fixed list in
> `src/lib/galleryPhotos.ts` (`/img/past_events/*.webp`). Converting gallery
> images is harmless but has no visible effect until per-event galleries are
> implemented.

## Examples

```bash
# Whole event at once from the inbox
npm run img -- --event api-days-tokyo --all --year 2026

# One global speaker avatar from a URL
npm run img -- "https://i.pravatar.cc/512?img=11" --kind avatar --name frank-kilcommins

# Event cover from a local file, before the event.yaml exists
npm run img -- ./downloads/tokyo.jpg --event api-days-tokyo --kind cover --year 2026
```

## Notes

- Requires dependencies installed (`npm ci`); `sharp` does the encoding.
- For higher quality, give a large source (pravatar `…/512`, unsplash `?w=2000`) —
  downscaling beats upscaling.
- After converting, run `npm run speakers` (avatars → `public/`, refreshes
  `SPEAKERS.md`) and `npm run covers` (covers → `public/`, then checks each event's
  `image:` field and prints the line to set). See the `add-event` skill, which
  calls this for you.
