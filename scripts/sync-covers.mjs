// Publish event cover images into public/, then check every event points at its own.
//
// Convention: any file in data/<year>/<slug>/images/ whose name starts with
// "cover" is that event's card artwork. It is published to
// public/img/events/<slug>/cover.<ext>, and the event's own event.yaml `image:`
// field must name that path — `image:` is the single source of truth the site
// reads, so nothing here is generated back into data/.
//
// Like speaker images, the source of truth is data/ and only data/ is committed;
// the copies under public/img/events/<slug>/ are build artifacts (gitignored),
// so this runs before dev/build via npm pre-hooks.
//
// The check is what keeps the two halves honest: the runtime can't read the
// filesystem (static export + Workers), so a cover that no event.yaml names
// would silently never be served, and an `image:` naming a cover that no longer
// exists would render a broken card. Both fail here instead.
//
// Run: npm run covers   (also wired to predev / prebuild / precf:build)

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const PUBLIC_EVENTS = path.join(ROOT, 'public/img/events');

// Raster formats we serve as-is. SVG is deliberately excluded: covers are photos.
const COVER_RE = /^cover.*\.(jpe?g|png|webp|avif)$/i;
// Any `image:` pointing into an event's published cover folder, whoever's it is —
// matching the wrong slug is a copy/paste mistake worth catching too.
const COVER_PATH_RE = /^\/img\/events\/([a-z0-9-]+)\/cover\.[a-z0-9]+$/i;

// data/<year>/<slug>/ — the folder name is the event slug (asserted by the
// events build). Collect the cover and the authored `image:` side by side.
const events = new Map(); // slug -> { dir, cover?: {src, ext}, image?: string }

for (const year of fs.readdirSync(DATA, { withFileTypes: true })) {
  if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
  const yearDir = path.join(DATA, year.name);
  for (const event of fs.readdirSync(yearDir, { withFileTypes: true })) {
    if (!event.isDirectory()) continue;
    const dir = path.join(yearDir, event.name);
    const manifestPath = path.join(dir, 'event.yaml');
    // A folder with no event.yaml isn't an event yet — nothing to publish or check.
    if (!fs.existsSync(manifestPath)) continue;

    const entry = { dir: path.relative(ROOT, dir) };
    const parsed = yaml.load(fs.readFileSync(manifestPath, 'utf8'));
    if (parsed && typeof parsed.image === 'string') entry.image = parsed.image.trim();

    const imagesDir = path.join(dir, 'images');
    if (fs.existsSync(imagesDir)) {
      const matches = fs
        .readdirSync(imagesDir)
        .filter((f) => COVER_RE.test(f))
        .sort();
      if (matches.length > 1) {
        console.warn(
          `covers: "${event.name}" has ${matches.length} cover files ` +
            `(${matches.join(', ')}) — using "${matches[0]}".`,
        );
      }
      if (matches.length > 0) {
        entry.cover = {
          src: path.join(imagesDir, matches[0]),
          ext: path.extname(matches[0]).toLowerCase(),
        };
      }
    }
    events.set(event.name, entry);
  }
}

// --- publish into public/ ----------------------------------------------------
// Normalized destination name, so the served path is derivable from slug + ext.
const published = new Map(); // slug -> served path
for (const [slug, { cover }] of [...events].sort(([a], [b]) => a.localeCompare(b))) {
  if (!cover) continue;
  const dest = path.join(PUBLIC_EVENTS, slug, `cover${cover.ext}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cover.src, dest);
  published.set(slug, `/img/events/${slug}/cover${cover.ext}`);
}

// Drop stale published covers for events whose source image was removed.
if (fs.existsSync(PUBLIC_EVENTS)) {
  for (const entry of fs.readdirSync(PUBLIC_EVENTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(PUBLIC_EVENTS, entry.name);
    for (const file of fs.readdirSync(dir)) {
      if (!/^cover\./i.test(file)) continue;
      if (published.get(entry.name) !== `/img/events/${entry.name}/${file}`) {
        fs.rmSync(path.join(dir, file));
      }
    }
  }
}

// --- check event.yaml `image:` against what was published --------------------
const problems = [];
for (const [slug, { dir, image }] of events) {
  const served = published.get(slug);
  const claimed = image && COVER_PATH_RE.test(image) ? image : undefined;

  if (served && image !== served) {
    problems.push(
      `${dir}/event.yaml has a cover at ${path.basename(served)} but \`image:\` reads ` +
        `${image ?? '(missing)'}.\n    Set it to:  image: ${served}`,
    );
  } else if (!served && claimed) {
    problems.push(
      `${dir}/event.yaml points \`image:\` at ${claimed}, but no cover* file exists in ` +
        `${dir}/images/.\n    Add the cover there (npm run img) or point \`image:\` at an existing path.`,
    );
  }
}

if (problems.length > 0) {
  console.error(`\ncovers: ${problems.length} event(s) out of sync:\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  process.exit(1);
}

console.log(`covers: ${published.size} published, ${events.size} event(s) in sync.`);
