---
name: convert-image
description: Convert an event cover, speaker avatar, or gallery photo to the site's best-fit size and WebP. Cover/gallery are saved per-event under public/img/events/<event-slug>/; speaker avatars are saved as the source of truth under data/speakers/image/ (global) and published to public/ by `npm run speakers`. Use when adding or updating event images, speaker photos, or gallery shots, or when asked to optimize/resize/host an image locally.
---

# Convert images for the OpenAPI events site

Resizes images to the right dimensions for where they're used, converts to WebP,
and writes them to the right place. Accepts a **local file path or a remote URL**
(it downloads URLs). Backed by `scripts/convert-image.mjs` (uses `sharp`).

## Where images live

**Cover/gallery** are served straight from `public/img/`. **Speaker avatars** are
the committed **source of truth in `data/`** and are copied into `public/img/` by
`npm run speakers` (which also regenerates `SPEAKERS.md`); the copies under
`public/img/speakers/**` are gitignored build artifacts.

```
source-images/<event-slug>/        ← raw inbox (gitignored, never committed)
  cover.jpg                         ← the event image (must be named cover.*)
  frank-kilcommins.jpg              ← name each speaker file after the speaker (kebab-case = slug)
  gallery/                          ← optional event photos
    anything.jpg

data/speakers/image/<slug>.webp                    ← speaker avatar (global source of truth)
data/<year>/<event>/speakers/image/<slug>.webp     ← per-event override avatar (--override)
public/img/events/<event-slug>/cover.webp          ← committed
public/img/events/<event-slug>/gallery/01.webp     ← committed (renumbered in sorted order)
```

**Naming convention:** a speaker's raw filename becomes their **slug**
(`frank-kilcommins.jpg` → slug `frank-kilcommins`). Name the event image `cover.*`.

## Usage

### Batch a whole event inbox (preferred)

Drop everything into `source-images/<event-slug>/`, then:

```bash
npm run img -- --event <event-slug> --all
```

Converts `cover.*` → `public/img/events/<event>/cover.webp`, every other top-level
image → a **global** speaker avatar in `data/speakers/image/`, and any `gallery/*`
→ numbered gallery images. Afterwards add the speakers to
`data/speakers/speakers.yaml` and run `npm run speakers`.

### Single image (path or URL)

```bash
# Global speaker avatar (the common case — no --event needed):
npm run img -- <input> --kind avatar --name <speaker-slug>

# Event cover / gallery (event-scoped):
npm run img -- <input> --event <event-slug> --kind <cover|gallery> [--name <slug>]

# Per-event override avatar (rare — a global speaker with a different photo here):
npm run img -- <input> --event <event-slug> --kind avatar --name <speaker-slug> --override
```

- `<input>` — local path or `https://…` URL.
- `--event` — event slug. **Required** for `cover`/`gallery` and `--override`;
  omitted for a global avatar.
- `--kind` — `cover` (event image), `avatar` (speaker), or `gallery`.
- `--name` — output slug. For `avatar` pass the speaker slug.

The script prints where the file landed and a hint on how to reference it
(avatars: set `image:` in a `speakers.yaml`, then `npm run speakers`).

## Sizes

| `--kind` | Used for | Output | Path |
|----------|----------|--------|------|
| `cover`  | event `image` (card/hero) | width 1200, aspect kept | `public/img/events/<event>/cover.webp` |
| `avatar` | speaker `image` (64px, square) | 320×320, center-cropped | `data/speakers/image/<slug>.webp` (global) |
| `gallery`| event photo gallery / lightbox | width 1600, aspect kept | `public/img/events/<event>/gallery/NN.webp` |

Images are never enlarged beyond their source resolution.

## Examples

```bash
# Whole event at once from the inbox
npm run img -- --event api-days-tokyo --all

# One global speaker avatar from a URL
npm run img -- "https://i.pravatar.cc/512?img=11" --kind avatar --name frank-kilcommins

# Event cover from a local file
npm run img -- ./downloads/tokyo.jpg --event api-days-tokyo --kind cover
```

## Notes

- Requires dependencies installed (`npm ci`); `sharp` does the encoding.
- For higher quality, give a large source (pravatar `…/512`, unsplash `?w=2000`) —
  downscaling beats upscaling.
- After converting avatars, run `npm run speakers` to publish them and refresh
  `SPEAKERS.md`. See the `add-event` skill, which calls this for you.
