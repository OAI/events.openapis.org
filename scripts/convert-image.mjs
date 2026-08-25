#!/usr/bin/env node
// Convert event/speaker/gallery images to the site's best-fit size + WebP.
//
// Covers and speaker avatars are the committed source of truth in data/; the
// copies under public/img/ are gitignored build artifacts, published by
// `npm run covers` / `npm run speakers` (both run on predev/prebuild):
//   data/<year>/<event>/images/cover.webp                            (event cover)
//   data/speakers/image/<speaker-slug>.webp                          (global speaker)
//   data/<year>/<event>/speakers/image/<speaker-slug>.webp           (event override, --override)
//   public/img/events/<event>/gallery/NN.webp                        (gallery, served as-is)
//
// Writing a cover straight into public/ would be pointless: sync-covers.mjs
// rebuilds that folder from data/ on every dev/build and deletes anything it
// did not publish, so the file would vanish and never be committed.
//
// Two modes:
//
// 1) Single image (local path or remote URL):
//      node scripts/convert-image.mjs <input> --kind avatar --name <speaker-slug>
//      node scripts/convert-image.mjs <input> --event <slug> --kind cover [--name <landmark>] [--year YYYY]
//      node scripts/convert-image.mjs <input> --event <slug> --kind gallery [--name <slug>]
//      node scripts/convert-image.mjs <input> --event <slug> --kind avatar --name <slug> --override
//
// 2) Batch a whole inbox folder (source-images/<event>/), gitignored:
//      node scripts/convert-image.mjs --event <slug> --all [--year YYYY]
//    Convention inside source-images/<event>/:
//      cover.*            -> data/<year>/<event>/images/cover.webp
//      <speaker-slug>.*   -> data/speakers/image/<speaker-slug>.webp  (global; name the file after the speaker)
//      gallery/*          -> public/img/events/<event>/gallery/NN.webp (numbered in sorted order)
//
// The year is read from the event's existing data/<year>/<event>/event.yaml;
// pass --year to convert images before that file exists.
//
// Each converted file's path is printed to stdout, with a hint on how to
// reference it (covers: `npm run covers`; avatars: set `image:` in a
// speakers.yaml, then `npm run speakers`).

import sharp from 'sharp';
import { mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_EXT = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;

// Target presets, derived from how the site renders each image kind:
//   avatar  — speaker photos rendered at 64px; 320px covers 2x/3x DPR, square crop.
//   cover   — event card/hero image (bg-cover); 1200px covers 2x DPR.
//   gallery — event photo gallery / lightbox (sourced at w=1600 today).
const PRESETS = {
  avatar: { width: 320, height: 320, fit: 'cover', quality: 82, sub: 'speakers' },
  cover: { width: 1200, height: null, fit: 'inside', quality: 80, sub: '' },
  gallery: { width: 1600, height: null, fit: 'inside', quality: 80, sub: 'gallery' },
};

// --all and --override are booleans; everything else takes the next token. A
// boolean must not swallow its successor (`--override` as the last argument used
// to parse as undefined, silently downgrading an override avatar to a global one).
const BOOLEAN_FLAGS = new Set(['all', 'override']);
const VALUE_FLAGS = new Set(['event', 'kind', 'name', 'year']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const flag = a.slice(2);
    if (BOOLEAN_FLAGS.has(flag)) {
      args[flag] = true;
    } else if (VALUE_FLAGS.has(flag)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`--${flag} needs a value.`);
      }
      args[flag] = value;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '') // drop extension
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadInput(input) {
  if (/^https?:\/\//i.test(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${input}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.resolve(input));
}

// Find the year folder holding data/<year>/<event>/event.yaml. An explicit
// --year wins, so images can be converted before the event.yaml exists.
async function resolveEventYear(event, year) {
  if (!event) throw new Error('This --kind is event-scoped; pass --event <slug>.');
  if (year) {
    if (!/^\d{4}$/.test(String(year))) throw new Error(`--year must be a 4-digit year, got "${year}".`);
    return String(year);
  }
  const dataDir = path.join(ROOT, 'data');
  for (const e of await readdir(dataDir, { withFileTypes: true })) {
    if (!e.isDirectory() || !/^\d{4}$/.test(e.name)) continue;
    try {
      await stat(path.join(dataDir, e.name, event, 'event.yaml'));
      return e.name;
    } catch {
      /* not in this year */
    }
  }
  throw new Error(
    `No event "${event}" found under data/<year>/. Create its event.yaml first, ` +
      `or pass --year <YYYY> to place the image ahead of it.`,
  );
}

// Decide where a converted file lands and how to reference it afterward.
async function destFor({ event, kind, name, override, year }) {
  if (kind === 'cover') {
    // Committed source of truth; sync-covers.mjs publishes it into public/ and
    // checks that the event's `image:` field names the published path.
    const y = await resolveEventYear(event, year);
    return {
      outDir: path.join(ROOT, 'data', y, event, 'images'),
      hint: `run \`npm run covers\` to publish it to /img/events/${event}/ — it prints the \`image:\` line to set in event.yaml`,
    };
  }
  if (kind === 'avatar') {
    if (override) {
      const y = await resolveEventYear(event, year);
      const dir = path.join(ROOT, 'data', y, event, 'speakers', 'image');
      return {
        outDir: dir,
        hint: `override for "${event}": set image: ${name}.webp for slug "${name}" in data/${y}/${event}/speakers/speakers.yaml, then \`npm run speakers\``,
      };
    }
    return {
      outDir: path.join(ROOT, 'data', 'speakers', 'image'),
      hint: `global speaker: add { slug: ${name}, image: ${name}.webp, ... } to data/speakers/speakers.yaml, then \`npm run speakers\``,
    };
  }
  // gallery -> served straight from public/ (committed as-is)
  return { outDir: path.join(ROOT, 'public/img/events', event, PRESETS[kind].sub), hint: null };
}

// Convert one source (path/URL/buffer) to WebP at its destination.
async function convertOne({ input, buffer, event, kind, name, override, year }) {
  const preset = PRESETS[kind];
  if (!preset) throw new Error(`Unknown --kind "${kind}" (use cover|avatar|gallery)`);

  const { outDir, hint } = await destFor({ event, kind, name, override, year });
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${name}.webp`);

  const buf = buffer ?? (await loadInput(input));
  await sharp(buf)
    .rotate() // honor EXIF orientation
    .resize({
      width: preset.width,
      height: preset.height ?? undefined,
      fit: preset.fit,
      position: 'centre',
      withoutEnlargement: true,
    })
    .webp({ quality: preset.quality })
    .toFile(outFile);

  const meta = await sharp(outFile).metadata();
  const outBytes = (await readFile(outFile)).length;
  const relPath = path.relative(ROOT, outFile).split(path.sep).join('/');
  console.error(`✓ ${kind} → ${relPath} (${meta.width}×${meta.height}, ${(buf.length / 1024).toFixed(0)}KB → ${(outBytes / 1024).toFixed(0)}KB)`);
  if (hint) console.error(`  ↳ ${hint}`);
  return relPath;
}

async function runBatch(event, year) {
  const inbox = path.join(ROOT, 'source-images', event);
  let entries;
  try {
    entries = await readdir(inbox, { withFileTypes: true });
  } catch {
    throw new Error(`Inbox not found: source-images/${event}/ — create it and drop raw images there.`);
  }

  const speakers = [];
  let cover = null;
  for (const e of entries) {
    if (e.isFile() && IMG_EXT.test(e.name)) {
      if (/^cover\./i.test(e.name)) cover = e.name;
      else speakers.push(e.name);
    }
  }

  if (cover) {
    await convertOne({ input: path.join(inbox, cover), event, kind: 'cover', name: 'cover', year });
  } else {
    console.error('• no cover.* found — skipping event image');
  }

  for (const file of speakers.sort()) {
    await convertOne({ input: path.join(inbox, file), event, kind: 'avatar', name: slugify(file) });
  }

  // gallery/ subfolder -> numbered gallery images
  try {
    const galleryDir = path.join(inbox, 'gallery');
    if ((await stat(galleryDir)).isDirectory()) {
      const files = (await readdir(galleryDir)).filter((f) => IMG_EXT.test(f)).sort();
      let n = 1;
      for (const file of files) {
        await convertOne({ input: path.join(galleryDir, file), event, kind: 'gallery', name: String(n++).padStart(2, '0') });
      }
    }
  } catch {
    /* no gallery subfolder */
  }

  console.error(
    `\nDone. Run \`npm run covers\` to publish the cover, and add each speaker to ` +
      `data/speakers/speakers.yaml then run \`npm run speakers\`. ` +
      `Gallery images (if any) are served from /img/events/${event}/gallery/.`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const event = args.event;
  const override = !!args.override;
  const year = args.year;

  if (args.all) {
    if (!event) {
      console.error('Batch mode needs --event <event-slug>.');
      process.exit(1);
    }
    await runBatch(event, year);
    return;
  }

  const input = args._[0];
  let kind = args.kind;
  // Accept --kind event as an alias for cover.
  if (kind === 'event') kind = 'cover';

  if (!input || !kind || !PRESETS[kind]) {
    console.error('Usage: node scripts/convert-image.mjs <input> --kind avatar --name <speaker-slug>');
    console.error('   or: node scripts/convert-image.mjs <input> --event <slug> --kind <cover|gallery> [--name <slug>] [--year YYYY]');
    console.error('   or: node scripts/convert-image.mjs --event <slug> --all [--year YYYY]   (batch source-images/<slug>/)');
    process.exit(1);
  }

  // cover/gallery and event-override avatars are event-scoped; a global avatar is not.
  if ((kind === 'cover' || kind === 'gallery' || override) && !event) {
    console.error(`--kind ${kind}${override ? ' --override' : ''} requires --event <event-slug>.`);
    process.exit(1);
  }

  let name = args.name ? slugify(args.name) : null;
  if (kind === 'cover') {
    // sync-covers.mjs only picks up files matching /^cover.*/, so a --name is a
    // descriptive suffix (cover-heidelberg-castle.webp), not a replacement.
    name = name && name !== 'cover' ? `cover-${name.replace(/^cover-/, '')}` : 'cover';
  } else if (!name) {
    name = slugify(path.basename(input.split('?')[0]) || kind);
  }
  if (!name) throw new Error('Could not derive a name; pass --name <slug>.');

  await convertOne({ input, event, kind, name, override, year });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
