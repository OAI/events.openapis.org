import yaml from 'js-yaml';

// Speaker resolution. Speakers have one canonical definition in the global
// registry (data/speakers/speakers.yaml); events reference them by slug and may
// override any field via their own data/<year>/<slug>/speakers/speakers.yaml.
// This module bundles every speakers.yaml at build time (require.context + the
// raw-string Turbopack rule in next.config.ts — no runtime fs, same as
// events.ts) and exposes resolveSpeaker(), which rehydrates a slug reference into
// the { name, position, photo } shape the UI already consumes.

// A speaker reference inside event.yaml: a bare slug, or {slug, tag} when a
// session needs a badge (e.g. the OAI badge). `tag` is a session-level
// annotation, not part of the speaker's identity.
export interface SpeakerRef {
  slug: string;
  tag?: string;
}
export type RawSpeakerRef = string | SpeakerRef;

// One external link on a speaker (LinkedIn, GitHub, personal site, ...). `id`
// picks the icon and the default label; `url` is used verbatim; `name` overrides
// the label when the generic one reads wrong ("My LinkedIn Profile").
export interface SpeakerLink {
  id: string;
  url: string;
  name?: string;
}

// As authored: either a list of links or — for the common single-link case — one
// bare mapping. Fields are optional here because YAML is hand-written; toLinks()
// drops anything without a url rather than rendering a dead anchor.
type RawSpeakerLink = { id?: string; url?: string; name?: string };
type RawSpeakerLinks = RawSpeakerLink | RawSpeakerLink[];

// One entry in a speakers.yaml file (global or per-event override).
interface SpeakerDef {
  slug: string;
  name?: string;
  role?: string;
  company?: string;
  image?: string;
  description?: string;
  urls?: RawSpeakerLinks;
  // Membership badges shown after the name, e.g. [TSC, OAI]. Merged per-field
  // like everything else, so a per-event speakers.yaml can override the whole
  // list (useful once an event is finished and membership later changes).
  badges?: string[];
}

export interface ResolvedSpeaker {
  slug: string;
  name: string;
  position: string; // "role | company" — the single string the UI renders
  photo: string; // served /img path or a full URL
  role?: string;
  company?: string;
  description?: string;
  // The speaker's own badges plus the optional session-level `tag`, so callers
  // render one list instead of handling two separate badge mechanisms.
  badges: string[];
  // Always an array (possibly empty), so callers never branch on shape.
  urls: SpeakerLink[];
  tag?: string;
}

// Bundle every speakers.yaml as a raw string. Keys look like:
//   ./speakers/speakers.yaml                         (global)
//   ./2026/api-days-singapore/speakers/speakers.yaml (per-event override)
type RawModule = string | { default: string };
const ctx = (
  require as unknown as {
    context(
      dir: string,
      recursive: boolean,
      re: RegExp,
    ): { keys(): string[]; (id: string): RawModule };
  }
).context('../../data', true, /(?:^|\/)speakers\.ya?ml$/);

const globalBySlug = new Map<string, SpeakerDef>();
// eventSlug -> (speakerSlug -> partial override)
const overridesByEvent = new Map<string, Map<string, SpeakerDef>>();

for (const key of ctx.keys()) {
  const mod = ctx(key);
  const raw = typeof mod === 'string' ? mod : mod.default;
  const list = (yaml.load(raw) as SpeakerDef[] | null) ?? [];
  const bySlug = new Map<string, SpeakerDef>();
  for (const def of list) {
    if (def?.slug) bySlug.set(def.slug, def);
  }
  // Path segments after the leading "./": either ["speakers","speakers.yaml"]
  // (global) or [year, eventSlug, "speakers", "speakers.yaml"] (per-event).
  const parts = key.replace(/^\.\//, '').split('/');
  if (parts[0] === 'speakers') {
    for (const [slug, def] of bySlug) globalBySlug.set(slug, def);
  } else {
    overridesByEvent.set(parts[parts.length - 3], bySlug);
  }
}

function toLinks(raw: RawSpeakerLinks | undefined): SpeakerLink[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .filter((link) => typeof link?.url === 'string' && link.url.trim() !== '')
    .map((link) => ({
      id: (link.id ?? 'website').trim().toLowerCase(),
      url: (link.url as string).trim(),
      name: link.name?.trim() || undefined,
    }));
}

// A bare filename resolves to a served /img path; a full URL or an absolute
// /path is used verbatim.
function isServedAsIs(image: string): boolean {
  return /^https?:\/\//.test(image) || image.startsWith('/');
}

export const AVATAR_PLACEHOLDER = '/img/_avatar-placeholder.svg';

export function hasPhoto(speaker: { photo: string }): boolean {
  return speaker.photo !== AVATAR_PLACEHOLDER;
}

export function resolveSpeaker(eventSlug: string, ref: RawSpeakerRef): ResolvedSpeaker {
  const slug = typeof ref === 'string' ? ref : ref.slug;
  const tag = typeof ref === 'string' ? undefined : ref.tag;

  const base = globalBySlug.get(slug);
  const override = overridesByEvent.get(eventSlug)?.get(slug);
  if (!base && !override) {
    throw new Error(
      `Unknown speaker slug "${slug}" referenced by event "${eventSlug}". ` +
        `Add it to data/speakers/speakers.yaml (or the event's speakers/speakers.yaml).`,
    );
  }

  // Per-field merge: global first, event override on top.
  const merged: SpeakerDef = { slug, ...base, ...override };
  const role = merged.role?.trim() ?? '';
  const company = merged.company?.trim() ?? '';

  // Where the winning image came from decides the served path: an override image
  // is published under the event, a global image under /img/speakers. Speakers
  // with no image yet fall back to a neutral committed avatar (photos are
  // harvested in a later pass), so background-image call sites never emit url().
  const imageFromOverride = !!override?.image;
  let photo: string = AVATAR_PLACEHOLDER;
  if (merged.image) {
    if (isServedAsIs(merged.image)) {
      photo = merged.image;
    } else {
      photo = imageFromOverride
        ? `/img/events/${eventSlug}/speakers/${slug}.webp`
        : `/img/speakers/${slug}.webp`;
    }
  }

  // Speaker-level badges first, then the session-level tag if it adds anything.
  const badges = (merged.badges ?? []).map((b) => String(b).toUpperCase());
  if (tag && !badges.includes(tag.toUpperCase())) badges.push(tag.toUpperCase());

  return {
    slug,
    name: merged.name ?? slug,
    position: [role, company].filter(Boolean).join(' | '),
    photo,
    role: role || undefined,
    company: company || undefined,
    description: merged.description,
    badges,
    urls: toLinks(merged.urls),
    ...(tag ? { tag } : {}),
  };
}
