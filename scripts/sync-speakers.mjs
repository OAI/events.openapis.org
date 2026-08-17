// Publish speaker images and (re)generate SPEAKERS.md.
//
// Speaker images are sourced from data/ (the single source of truth) and only
// data/ is committed — the copies under public/img/ are build artifacts, so this
// script runs before dev/build (npm pre-hooks) to materialize them. It also
// validates that every speaker slug referenced by an event actually exists, and
// writes SPEAKERS.md (each speaker + the events they appear in).
//
// Run: npm run speakers   (also wired to predev / prebuild / precf:build)

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const PUBLIC_SPEAKERS = path.join(ROOT, 'public/img/speakers');

// --- discover data files -----------------------------------------------------
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const files = walk(DATA);
const eventFiles = files.filter((f) => path.basename(f) === 'event.yaml');
const speakerFiles = files.filter((f) => path.basename(f) === 'speakers.yaml');

// --- load speaker registries -------------------------------------------------
// globalBySlug: slug -> {def, imageDir}
// overridesByEvent: eventSlug -> Map(slug -> {def, imageDir})
const globalBySlug = new Map();
const overridesByEvent = new Map();

for (const file of speakerFiles) {
  const list = yaml.load(fs.readFileSync(file, 'utf8')) ?? [];
  const imageDir = path.join(path.dirname(file), 'image');
  const rel = path.relative(DATA, file).split(path.sep); // e.g. speakers/speakers.yaml
  const isGlobal = rel[0] === 'speakers';
  const bySlug = isGlobal ? globalBySlug : new Map();
  for (const def of list) {
    if (def?.slug) bySlug.set(def.slug, { def, imageDir });
  }
  if (!isGlobal) {
    // rel: [year, eventSlug, 'speakers', 'speakers.yaml']
    overridesByEvent.set(rel[rel.length - 3], bySlug);
  }
}

// --- load events + collect referenced slugs ----------------------------------
const refSlug = (ref) => (typeof ref === 'string' ? ref : ref?.slug);

const events = eventFiles.map((file) => {
  const ev = yaml.load(fs.readFileSync(file, 'utf8'));
  const slugs = new Set();
  for (const ref of ev.speakers ?? []) slugs.add(refSlug(ref));
  for (const day of Object.values(ev.agenda ?? {})) {
    for (const sessions of Object.values(day)) {
      for (const s of sessions) {
        if (s.speaker) slugs.add(refSlug(s.speaker));
        for (const ref of s.speakers ?? []) slugs.add(refSlug(ref));
      }
    }
  }
  for (const talk of ev.talks ?? []) {
    for (const ref of talk.speakers ?? []) slugs.add(refSlug(ref));
  }
  return {
    slug: ev.slug,
    title: ev.title,
    permalink: ev.permalink,
    date: ev.event_date,
    status: ev.status,
    file,
    refs: slugs,
  };
});

// --- validate every referenced slug resolves ---------------------------------
const errors = [];
for (const ev of events) {
  for (const slug of ev.refs) {
    if (!slug) continue;
    const hasOverride = overridesByEvent.get(ev.slug)?.has(slug);
    if (!globalBySlug.has(slug) && !hasOverride) {
      errors.push(`  - event "${ev.slug}" references unknown speaker slug "${slug}"`);
    }
  }
}
if (errors.length) {
  console.error('Unknown speaker slug(s) — add them to data/speakers/speakers.yaml:');
  console.error(errors.join('\n'));
  process.exit(1);
}

// --- freeze affiliations for finished events (opt-in) ------------------------
// role/company are point-in-time facts: they were true *as of* the event. A
// finished event is a historical record, so we snapshot each speaker's current
// role/company into the event's own speakers/speakers.yaml (write-once). Identity
// — name/image/description — stays inherited from the global registry, so a later
// photo/bio update still flows through. Upcoming/active events are deliberately
// NOT frozen: they track the current registry until the day they finish.
//
//   npm run speakers -- --freeze              # every finished event (write-once)
//   npm run speakers -- --freeze <event-slug> # one event (e.g. the just-finished one)
const argv = process.argv.slice(2);
const freezeIdx = argv.indexOf('--freeze');
if (freezeIdx !== -1) {
  const named = argv[freezeIdx + 1];
  const target = named && !named.startsWith('--') ? named : null;
  const targets = target
    ? events.filter((e) => e.slug === target)
    : events.filter((e) => e.status === 'finished');
  if (target && targets.length === 0) {
    console.error(`No event "${target}" found under data/<year>/.`);
    process.exit(1);
  }

  let total = 0;
  for (const ev of targets) {
    const outFile = path.join(path.dirname(ev.file), 'speakers', 'speakers.yaml');
    const existing = fs.existsSync(outFile) ? (yaml.load(fs.readFileSync(outFile, 'utf8')) ?? []) : [];
    const bySlug = new Map(existing.map((d) => [d.slug, d]));
    const froze = [];
    for (const slug of ev.refs) {
      if (!slug) continue;
      const cur = bySlug.get(slug);
      if (cur && (cur.role != null || cur.company != null)) continue; // write-once
      const g = globalBySlug.get(slug)?.def ?? {};
      if (!g.role && !g.company) continue; // no affiliation to snapshot
      const entry = cur ?? { slug };
      if (g.role) entry.role = g.role;
      if (g.company) entry.company = g.company;
      bySlug.set(slug, entry);
      froze.push(slug);
    }
    if (froze.length) {
      const list = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, yaml.dump(list, { lineWidth: -1, noRefs: true, quotingType: "'" }));
      console.log(`froze ${froze.length} speaker(s) for "${ev.slug}": ${froze.join(', ')}`);
      total += froze.length;
    }
  }
  console.log(total ? `Snapshotted ${total} affiliation(s).` : 'Nothing to freeze — already up to date.');
  process.exit(0);
}

// --- warn about finished events whose titles still track the registry --------
// Safety net for "freeze on finish": if a past event still inherits a speaker's
// affiliation globally, a future title change will silently rewrite its history.
const unfrozen = [];
for (const ev of events) {
  if (ev.status !== 'finished') continue;
  const ov = overridesByEvent.get(ev.slug);
  for (const slug of ev.refs) {
    if (!slug) continue;
    const g = globalBySlug.get(slug)?.def ?? {};
    if (!g.role && !g.company) continue; // no affiliation that could drift
    const frozen = ov?.get(slug)?.def;
    if (frozen && (frozen.role != null || frozen.company != null)) continue;
    unfrozen.push(`${ev.slug}:${slug}`);
  }
}
if (unfrozen.length) {
  console.warn(
    `Note: ${unfrozen.length} speaker title(s) on finished events still track the registry ` +
      `and will change if it changes. Run \`npm run speakers -- --freeze\` to snapshot ` +
      `(${unfrozen.join(', ')}).`,
  );
}

// --- copy local images into public/ ------------------------------------------
const isServedAsIs = (image) => /^https?:\/\//.test(image) || image.startsWith('/');

function copyImage(image, srcDir, destFile) {
  const src = path.join(srcDir, image);
  if (!fs.existsSync(src)) {
    console.error(`Missing speaker image: ${path.relative(ROOT, src)}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.copyFileSync(src, destFile);
}

let copied = 0;
// global images -> public/img/speakers/<slug>.webp
fs.mkdirSync(PUBLIC_SPEAKERS, { recursive: true });
for (const [slug, { def, imageDir }] of globalBySlug) {
  if (def.image && !isServedAsIs(def.image)) {
    copyImage(def.image, imageDir, path.join(PUBLIC_SPEAKERS, `${slug}.webp`));
    copied++;
  }
}
// per-event override images -> public/img/events/<eventSlug>/speakers/<slug>.webp
for (const [eventSlug, bySlug] of overridesByEvent) {
  for (const [slug, { def, imageDir }] of bySlug) {
    if (def.image && !isServedAsIs(def.image)) {
      copyImage(
        def.image,
        imageDir,
        path.join(ROOT, 'public/img/events', eventSlug, 'speakers', `${slug}.webp`),
      );
      copied++;
    }
  }
}

// --- build slug -> events participation --------------------------------------
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
function dateValue(dateStr = '') {
  const m = /([A-Za-z]+)\s+(\d+).*?(\d{4})/.exec(dateStr);
  if (!m) return 0;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  return Date.UTC(Number(m[3]), month < 0 ? 0 : month, Number(m[2]));
}

const eventsBySpeaker = new Map(); // slug -> [{title, permalink, date}]
for (const ev of events) {
  for (const slug of ev.refs) {
    if (!slug) continue;
    if (!eventsBySpeaker.has(slug)) eventsBySpeaker.set(slug, []);
    eventsBySpeaker.get(slug).push(ev);
  }
}

// --- generate SPEAKERS.md ----------------------------------------------------
const speakers = [...globalBySlug.entries()]
  .map(([slug, { def }]) => ({ slug, ...def }))
  .sort((a, b) => (a.name ?? a.slug).localeCompare(b.name ?? b.slug));

const lines = [
  '# Speakers',
  '',
  '<!-- Generated by scripts/sync-speakers.mjs — do not edit by hand. -->',
  '<!-- Run `npm run speakers` to regenerate. -->',
  '',
];
for (const sp of speakers) {
  const subtitle = [sp.role, sp.company].filter(Boolean).join(', ');
  lines.push(`**${sp.name ?? sp.slug}**${subtitle ? ` — ${subtitle}` : ''}`);
  lines.push('');
  if (sp.description) {
    lines.push(String(sp.description).trim());
    lines.push('');
  }
  const appearances = (eventsBySpeaker.get(sp.slug) ?? [])
    .slice()
    .sort((a, b) => dateValue(b.date) - dateValue(a.date));
  if (appearances.length) {
    for (const ev of appearances) {
      lines.push(`- [${ev.title}](${ev.permalink}) — ${ev.date}`);
    }
  } else {
    lines.push('- _No events yet._');
  }
  lines.push('');
}

fs.writeFileSync(path.join(ROOT, 'SPEAKERS.md'), lines.join('\n'));

console.log(
  `speakers: ${speakers.length} in registry, ${copied} image(s) published, ` +
    `${events.length} events. Wrote SPEAKERS.md.`,
);
