---
name: add-event
description: Add a new event (or speaker) to the OpenAPI events site by creating data/<year>/<event-slug>/event.yaml and referencing speakers by slug from the global registry (data/speakers/speakers.yaml), with speaker avatars and the event image converted to repo-hosted WebP. Use when asked to add/create a new event, conference, masterclass, or talk to the site, or to add a speaker to an existing event.
---

# Add an event to the OpenAPI events site

Each event is its own file: **`data/<year>/<event-slug>/event.yaml`** (one event
per file, grouped by year, discovered and bundled at build time, typed by
`EventItem` in `lib/events.ts`). `<year>` comes from the event's `event_date`.

Speakers are **not** written inline. Every speaker has one definition in the
global registry **`data/speakers/speakers.yaml`** (keyed by `slug`), and events
reference them **by slug**. The resolver (`lib/speakers.ts`) rehydrates a slug
into the `{name, position, photo}` shape the UI renders.

## Steps

1. **Gather the details** from the user (title, dates, location, type, times,
   description, speakers, image). Ask for anything missing — especially the
   event image and each speaker photo (local path or URL).

2. **Convert every image to repo-hosted WebP** with the `convert-image` skill /
   `npm run img`. Everything committed lives under `data/`: the cover in
   `data/<year>/<event-slug>/images/` (published to `public/` by `npm run covers`)
   and speaker avatars in `data/speakers/image/` (published by `npm run speakers`).
   Nothing under `public/img/events/` is committed — `npm run covers` rebuilds
   that folder on every dev/build and deletes anything it did not publish. Do
   **not** put remote URLs into new speaker entries if you can host them —
   though a URL in `image:` is allowed and used as-is.

   The converter reads the year from the event's existing `event.yaml`. When
   converting **before** step 4, pass `--year <YYYY>`.

   **Preferred — batch the inbox.** Have the user drop raw files into
   `source-images/<event-slug>/` (gitignored): the event image named `cover.*`,
   each speaker file named after the speaker slug (`frank-kilcommins.jpg`),
   optional `gallery/` subfolder (converted, but not rendered anywhere yet — see
   the `convert-image` skill). Then:

   ```bash
   npm run img -- --event <event-slug> --all --year <year>
   ```

   **Or one image at a time** (path or URL):

   ```bash
   npm run img -- "<url-or-path>" --event <event-slug> --kind cover --year <year>
   npm run img -- "<url-or-path>" --kind avatar --name frank-kilcommins   # global speaker
   ```

3. **Register each speaker** in `data/speakers/speakers.yaml` (skip any that are
   already there — reuse the existing slug). See the speaker schema below.

4. **Create `data/<year>/<event-slug>/event.yaml`** with the schema below,
   referencing speakers by slug.

5. **Publish images + regenerate `SPEAKERS.md`:**

   ```bash
   npm run speakers   # avatars -> public/img/speakers/, rewrites SPEAKERS.md
   npm run covers     # covers  -> public/img/events/<slug>/, rewrites data/covers.generated.yml
   ```

   Both also run automatically on `npm run dev` / `npm run build`. `speakers`
   **fails with a clear error** if an event references a slug that isn't in the
   registry. `covers` writes `data/covers.generated.yml`, which **is** committed
   and which overrides the `image:` field in `event.yaml` — so commit it along
   with the new cover.

6. **Ordering (optional).** Events are listed by date by default (upcoming
   soonest-first, past most-recent-first). To pin a specific order, add the slug
   to `data/events.order.yml` — that file is the primary order source.

7. **Verify**: `npm run typecheck` then `npm run build` (must emit `out/`).
   The build re-runs `speakers` + `covers` first, so it also catches an unknown
   speaker slug or a cover that never made it into `data/`.

## Schema — `data/<year>/<event-slug>/event.yaml`

Required fields:

```yaml
title: 'API Days Tokyo' # display name
slug: api-days-tokyo # MUST equal the event folder name; used in the URL
event_date: 'October 14 — 15, 2026' # human string; em dash (—) for ranges; the year picks the folder
location: 'Tokyo International Forum, Japan'
type: 'Event' # 'Event' | 'Conference' | 'Masterclass'
status: 'upcoming' # 'active' (featured) | 'upcoming' | 'finished'
image: '/img/background.jpg' # fallback only — data/<year>/<slug>/images/cover* wins
time_start: '09:00'
time_end: '17:00'
description: 'One-line summary of the event.'
permalink: '/events/api-days-tokyo' # must be '/events/' + slug
speakers: [frank-kilcommins] # slugs from data/speakers/speakers.yaml; [] if none
tags: [event] # lowercase of type, e.g. [conference]
```

Optional detail-page fields (omit if not known yet):

```yaml
metaTitle: 'API Days Tokyo' # SEO title override
metaDescription: 'Join us at API Days Tokyo'
sponsors:
  - name: boomi
agenda: # event-page schedule: date -> category -> sessions
  'October 14':
    'Opening and keynote':
      - title: 'Welcome'
        time: '09:00 — 09:25'
        permalink: /events/talks/tokyo-welcome # optional, links to a talk below
        speakers: # slugs; use {slug, tag} to add a badge (e.g. OAI)
          - { slug: frank-kilcommins, tag: OAI }
talks: # individual talk pages at /events/talks/<slug>
  - slug: tokyo-welcome
    title: 'Welcome'
    description: 'Full talk description.'
    time: 'October 14, 09:00 — 09:25'
    category: 'Opening and keynote'
    speakers: [frank-kilcommins] # slugs
    schedule: # sidebar day schedule on the talk page
      - { time: '09:00', title: 'Welcome', permalink: /events/talks/tokyo-welcome }
```

A speaker reference is a bare slug (`frank-kilcommins`) or `{slug, tag}` when a
session needs a badge. Agenda sessions also accept the singular `speaker: <slug>`.
`talks[]` do not repeat the event title/date — those come from the parent.

## Schema — `data/speakers/speakers.yaml` (global registry)

A list of speaker definitions. `position` shown in the UI is `role | company`.

```yaml
- slug: frank-kilcommins # stable id; the reference key. kebab-case.
  name: Frank Kilcommins
  role: Head of Enterprise Architecture
  company: Axtic
  image: frank-kilcommins.webp # filename in data/speakers/image/  OR a full URL
  description: >- # optional bio (shown in SPEAKERS.md)
    One or two sentences.
```

- `image`: a **bare filename** lives in `data/speakers/image/` and is published to
  `public/img/speakers/<slug>.webp` by `npm run speakers`; a **full URL** is used
  as-is (fine for placeholder avatars).
- **Per-event override (rare):** to give a global speaker different data at one
  event, add a partial entry (matched by `slug`) to
  `data/<year>/<event-slug>/speakers/speakers.yaml`; present fields win, missing
  fields fall back to the global entry. Override images go in that folder's
  `image/` and are converted with `--override` (see the `convert-image` skill).
  This same file is what the **freeze-on-finish** workflow writes (see below) —
  a finished event snapshots each speaker's `role`/`company` here so a later
  registry edit can't rewrite its history.

### Affiliation is point-in-time (identity vs. affiliation)

`name`, `image`, and `description` are a speaker's **identity** — stable, shared,
and updated in one place (the registry) for everyone, everywhere. `role` and
`company` are **affiliation** — only true *as of* an event. The registry holds
the speaker's **current** affiliation; upcoming/active events inherit it, so
changing a title before an event is a single edit. Past events are frozen (below)
so they keep the title that was true then.

### Field rules

- **slug** (event) — unique kebab-case, **equal to the event folder name**;
  `permalink` must be `/events/<slug>`. For yearly editions, suffix the year
  (e.g. `api-days-tokyo-2025`), and place it in that year's folder.
- **status** — `active` renders as the featured card; `upcoming` a normal
  upcoming card; `finished` shows on the past-events page.
- **type / tags** — `tags` is the lowercased `type` in a list: `Event`→`[event]`,
  `Conference`→`[conference]`, `Masterclass`→`[masterclass]`.
- **event_date** — em dash `—` for ranges; the **year** in it selects the
  `data/<year>/` folder.

## Adding a speaker to an existing event

1. Convert the avatar (global): `npm run img -- "<url-or-path>" --kind avatar --name <speaker-slug>`.
   (`--override` makes it event-specific instead; it needs `--event <slug>`.)
2. Add the speaker to `data/speakers/speakers.yaml` (if not already there).
3. Add the `<speaker-slug>` to that event's `speakers:` list (and/or agenda/talks)
   in `data/<year>/<event-slug>/event.yaml`.
4. `npm run speakers` to publish + refresh `SPEAKERS.md`.

## When an event finishes (freeze speaker titles)

When you flip an event to `status: finished`, snapshot its speakers' current
`role`/`company` into the event so a future registry edit can't retroactively
rewrite that past event's page:

```bash
npm run speakers -- --freeze <event-slug>   # the just-finished event
npm run speakers -- --freeze                 # or: every finished event, write-once
```

This writes `data/<year>/<event-slug>/speakers/speakers.yaml` with a per-slug
`role`/`company` snapshot (identity — name/image/description — stays inherited, so
photos/bios still update globally). It's **write-once**: an existing frozen value
is never overwritten, so run it *while the titles are still accurate* (right when
the event finishes). A plain `npm run speakers` prints a one-line **reminder** if
any finished event still has un-frozen titles.

Do the snapshot at finish time, not later — freeze captures whatever the registry
says *now*, so freezing after you've already changed a global title bakes in the
new (wrong) value. Upcoming/active events are intentionally left un-frozen; they
should track the current registry.

## After adding

Run `npm run speakers`, then confirm it validates (`npm run typecheck` /
`npm run build`) and tell the user the event URL (`/events/<slug>`). Both deploy
targets pick it up: the GitHub Pages build and the Cloudflare Worker build both
bundle every `event.yaml` and `speakers.yaml`.
