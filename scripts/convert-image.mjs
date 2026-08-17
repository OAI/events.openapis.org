#!/usr/bin/env node
// Convert event/speaker/gallery images to the site's best-fit size + WebP.
//
// Cover/gallery images are per-event under public/img/events/<event-slug>/.
// Speaker avatars are the source of truth in data/ and published to public/ by
// `npm run speakers`:
//   public/img/events/<event>/cover.webp
//   public/img/events/<event>/gallery/NN.webp
//   data/speakers/image/<speaker-slug>.webp                         (global speaker)
//   data/<year>/<event>/speakers/image/<speaker-slug>.webp          (event override, --override)
//
// Two modes:
//
// 1) Single image (local path or remote URL):
//      node scripts/convert-image.mjs <input> --kind avatar --name <speaker-slug>
//      node scripts/convert-image.mjs <input> --event <slug> --kind <cover|gallery> [--name <slug>]
//      node scripts/convert-image.mjs <input> --event <slug> --kind avatar --name <slug> --override
//
// 2) Batch a whole inbox folder (source-images/<event>/), gitignored:
//      node scripts/convert-image.mjs --event <slug> --all
//    Convention inside source-images/<event>/:
//      cover.*            -> public/img/events/<event>/cover.webp
//      <speaker-slug>.*   -> data/speakers/image/<speaker-slug>.webp  (global; name the file after the speaker)
//      gallery/*          -> public/img/events/<event>/gallery/NN.webp (numbered in sorted order)
//
// Each converted file's path is printed to stdout, with a hint on how to
// reference it (avatars: set `image:` in a speakers.yaml, then `npm run speakers`).

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

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
    else args._.push(a);
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

// Find the year folder holding data/<year>/<event>/event.yaml (for --override).
async function resolveEventYear(event) {
  if (!event) throw new Error('avatar --override requires --event <slug>.');
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
  throw new Error(`No event "${event}" found under data/<year>/. Create its event.yaml first.`);
}

// Decide where a converted file lands and how to reference it afterward.
async function destFor({ event, kind, name, override }) {
  if (kind === 'avatar') {
    if (override) {
      const year = await resolveEventYear(event);
      const dir = path.join(ROOT, 'data', year, event, 'speakers', 'image');
      return {
        outDir: dir,
        hint: `override for "${event}": set image: ${name}.webp for slug "${name}" in data/${year}/${event}/speakers/speakers.yaml, then \`npm run speakers\``,
      };
    }
    return {
      outDir: path.join(ROOT, 'data', 'speakers', 'image'),
      hint: `global speaker: add { slug: ${name}, image: ${name}.webp, ... } to data/speakers/speakers.yaml, then \`npm run speakers\``,
    };
  }
  // cover / gallery -> served straight from public/
  return { outDir: path.join(ROOT, 'public/img/events', event, PRESETS[kind].sub), hint: null };
}

// Convert one source (path/URL/buffer) to WebP at its destination.
async function convertOne({ input, buffer, event, kind, name, override }) {
  const preset = PRESETS[kind];
  if (!preset) throw new Error(`Unknown --kind "${kind}" (use cover|avatar|gallery)`);

  const { outDir, hint } = await destFor({ event, kind, name, override });
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

async function runBatch(event) {
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
    await convertOne({ input: path.join(inbox, cover), event, kind: 'cover', name: 'cover' });
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
    `\nDone. Cover/gallery live under /img/events/${event}/. Speaker avatars went to ` +
      `data/speakers/image/ — add each to data/speakers/speakers.yaml, then \`npm run speakers\`.`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const event = args.event;
  const override = !!args.override;

  if (args.all) {
    if (!event) {
      console.error('Batch mode needs --event <event-slug>.');
      process.exit(1);
    }
    await runBatch(event);
    return;
  }

  const input = args._[0];
  let kind = args.kind;
  // Accept --kind event as an alias for cover.
  if (kind === 'event') kind = 'cover';

  if (!input || !kind || !PRESETS[kind]) {
    console.error('Usage: node scripts/convert-image.mjs <input> --kind avatar --name <speaker-slug>');
    console.error('   or: node scripts/convert-image.mjs <input> --event <slug> --kind <cover|gallery> [--name <slug>]');
    console.error('   or: node scripts/convert-image.mjs --event <slug> --all   (batch source-images/<slug>/)');
    process.exit(1);
  }

  // cover/gallery and event-override avatars are event-scoped; a global avatar is not.
  if ((kind === 'cover' || kind === 'gallery' || override) && !event) {
    console.error(`--kind ${kind}${override ? ' --override' : ''} requires --event <event-slug>.`);
    process.exit(1);
  }

  let name = args.name ? slugify(args.name) : null;
  if (!name) {
    if (kind === 'cover') name = 'cover';
    else name = slugify(path.basename(input.split('?')[0]) || kind);
  }
  if (!name) throw new Error('Could not derive a name; pass --name <slug>.');

  await convertOne({ input, event, kind, name, override });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
