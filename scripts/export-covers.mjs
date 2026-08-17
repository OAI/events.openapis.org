// Export every event cover into one flat folder, named after its event.
//
// The covers live next to their event as data/<year>/<slug>/images/cover-*.<ext>,
// where the filename describes the *landmark* (cover-battersea.jpg) and several
// events legitimately reuse the same photo. This collects them into a single
// folder keyed by event instead:
//
//   covers-export/cover-api-days-london-2026.webp
//
// so the whole set can be reviewed or handed off at a glance. It only reads from
// data/ — nothing here feeds the site build (that's scripts/sync-covers.mjs).
//
// Sources are full-resolution camera files (up to 6000px / 12MB), so they are
// converted with the same preset the site uses for covers: max 1200px wide,
// WebP q80, never upscaled. Pass --no-resize to keep the original dimensions.
//
// Run: npm run covers:export [-- --out <dir>] [--width N] [--quality N]
//                            [--no-resize] [--clean]

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

// Same matcher as sync-covers.mjs, so both agree on what counts as a cover.
const COVER_RE = /^cover.*\.(jpe?g|png|webp|avif)$/i;

function parseArgs(argv) {
  const args = { out: 'covers-export', width: 1200, quality: 80, resize: true, clean: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-resize') args.resize = false;
    else if (a === '--clean') args.clean = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--width') args.width = Number(argv[++i]);
    else if (a === '--quality') args.quality = Number(argv[++i]);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  if (!args.out) {
    console.error('--out needs a directory.');
    process.exit(1);
  }
  if (!Number.isFinite(args.width) || args.width <= 0) {
    console.error('--width needs a positive number.');
    process.exit(1);
  }
  if (!Number.isFinite(args.quality) || args.quality < 1 || args.quality > 100) {
    console.error('--quality needs a number between 1 and 100.');
    process.exit(1);
  }
  return args;
}

// data/<year>/<slug>/images/cover* — the folder name is the event slug (the
// site's cover pipeline keys off the same convention).
function findCovers() {
  const found = [];
  for (const year of fs.readdirSync(DATA, { withFileTypes: true })) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    const yearDir = path.join(DATA, year.name);
    for (const event of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!event.isDirectory()) continue;
      const imagesDir = path.join(yearDir, event.name, 'images');
      if (!fs.existsSync(imagesDir)) continue;

      const matches = fs
        .readdirSync(imagesDir)
        .filter((f) => COVER_RE.test(f))
        .sort();
      if (matches.length === 0) continue;
      if (matches.length > 1) {
        console.warn(
          `warn: "${event.name}" has ${matches.length} covers (${matches.join(', ')}) — ` +
            `exporting "${matches[0]}".`,
        );
      }
      found.push({ slug: event.name, year: year.name, src: path.join(imagesDir, matches[0]) });
    }
  }
  return found.sort((a, b) => a.slug.localeCompare(b.slug));
}

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(ROOT, args.out);

const covers = findCovers();
if (covers.length === 0) {
  console.error('No covers found under data/<year>/<slug>/images/.');
  process.exit(1);
}

if (args.clean && fs.existsSync(outDir)) {
  for (const f of fs.readdirSync(outDir)) {
    if (/^cover-.*\.webp$/i.test(f)) fs.rmSync(path.join(outDir, f));
  }
}
fs.mkdirSync(outDir, { recursive: true });

let srcBytes = 0;
let outBytes = 0;

for (const { slug, src } of covers) {
  const dest = path.join(outDir, `cover-${slug}.webp`);
  let pipeline = sharp(src).rotate(); // honour EXIF orientation
  if (args.resize) {
    pipeline = pipeline.resize({ width: args.width, fit: 'inside', withoutEnlargement: true });
  }
  await pipeline.webp({ quality: args.quality }).toFile(dest);

  const meta = await sharp(dest).metadata();
  const sBytes = fs.statSync(src).size;
  const oBytes = fs.statSync(dest).size;
  srcBytes += sBytes;
  outBytes += oBytes;
  console.log(
    `✓ cover-${slug}.webp  ${meta.width}×${meta.height}  ` +
      `${(sBytes / 1024).toFixed(0)}KB → ${(oBytes / 1024).toFixed(0)}KB  ` +
      `(from ${path.relative(ROOT, src)})`,
  );
}

const mb = (b) => (b / 1048576).toFixed(2);
console.log(
  `\n${covers.length} cover(s) → ${path.relative(ROOT, outDir) || outDir}/  ` +
    `(${mb(srcBytes)}MB → ${mb(outBytes)}MB)`,
);
