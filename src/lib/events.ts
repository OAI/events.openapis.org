import yaml from 'js-yaml';
// Each event is its own data/<year>/<slug>/event.yaml. They are discovered and
// bundled at build time (require.context below) — no runtime fs, since the
// Cloudflare Workers runtime has none. events.order.yml (bundled as a raw string
// by the Turbopack YAML rule in next.config.ts) is the primary ordering
// source. Speakers are referenced by slug and rehydrated by ./speakers.
import rawOrder from '../../data/events.order.yml';
import {
  hasPhoto,
  resolveSpeaker,
  type RawSpeakerRef,
  type ResolvedSpeaker,
  type SpeakerLink,
} from './speakers';

export type { SpeakerLink };

export interface Speaker {
  name: string;
  position: string;
  photo: string;
  hasPhoto: boolean;
  // Membership pills rendered after the name (e.g. ["TSC", "OAI"]).
  badges?: string[];
  urls?: SpeakerLink[];
}

// --- Event detail page (agenda) ---------------------------------------------
export interface AgendaSpeaker {
  name: string;
  position?: string;
  photo?: string;
  badges?: string[];
  urls?: SpeakerLink[];
  tag?: string;
}

export interface AgendaSession {
  title: string;
  speaker?: string;
  speakers?: AgendaSpeaker[];
  time?: string;
  date?: string;
  permalink?: string;
  slidesUrl?: string;
  videoUrl?: string;
  // Resolved from the matching talk (by permalink → talk slug) at hydration, so
  // the session modal can show the real abstract instead of a generic line.
  description?: string;
}

export type AgendaByDate = {
  [date: string]: {
    [category: string]: AgendaSession[];
  };
};

export interface Sponsor {
  name: string;
  logo?: string;
}

// --- Talk pages (nested under each event) -----------------------------------
export interface ScheduleSlot {
  time: string;
  title: string;
  permalink: string;
}

export interface TalkSpeaker {
  name: string;
  position: string;
  photo: string;
  badges?: string[];
  urls?: SpeakerLink[];
}

export interface EventTalk {
  slug: string;
  title: string;
  description: string;
  time?: string;
  category?: string;
  speakers?: TalkSpeaker[];
  schedule?: ScheduleSlot[];
  slidesUrl?: string;
  videoUrl?: string;
  metaTitle?: string;
}

export interface EventItem {
  title: string;
  slug: string;
  event_date: string;
  location: string;
  type: string;
  status: 'active' | 'upcoming' | 'finished';
  image: string;
  time_start?: string;
  time_end?: string;
  // ISO datetime of the event's first day, derived from event_date (+ time_start
  // when present). Drives the countdown on the featured card.
  startDate?: string;
  endDate?: string;
  description: string;
  permalink: string;
  speakers: Speaker[];
  tags: string[];
  // Optional detail-page data, present for events with a full program:
  metaTitle?: string;
  metaDescription?: string;
  sponsors?: Sponsor[];
  agenda?: AgendaByDate;
  talks?: EventTalk[];
}

// --- Raw (pre-hydration) shapes, as parsed straight from event.yaml ----------
// In the file, speakers are slug references (or {slug, tag}); the resolver turns
// them into the Speaker/AgendaSpeaker/TalkSpeaker shapes the components expect.
interface RawAgendaSession {
  title: string;
  speaker?: RawSpeakerRef; // single slug (legacy singular form)
  speakers?: RawSpeakerRef[];
  time?: string;
  date?: string;
  permalink?: string;
  slidesUrl?: string;
  videoUrl?: string;
}
type RawAgendaByDate = {
  [date: string]: { [category: string]: RawAgendaSession[] };
};
type RawTalk = Omit<EventTalk, 'speakers'> & { speakers?: RawSpeakerRef[] };
type RawEvent = Omit<EventItem, 'speakers' | 'agenda' | 'talks'> & {
  speakers?: RawSpeakerRef[];
  agenda?: RawAgendaByDate;
  talks?: RawTalk[];
};

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

// Parse the first day out of a display date like "December 1 – 3, 2026" or
// "September 30 – October 1, 2026" and return a local ISO datetime string
// (YYYY-MM-DDTHH:MM:SS). time_start (e.g. "09:00") sets the clock; default 09:00.
// Returns undefined when the date can't be parsed, so callers can skip the
// countdown rather than render a bogus target.
function isoStartDate(event_date?: string, time_start?: string): string | undefined {
  if (!event_date) return undefined;
  const m = /([A-Za-z]+)\s+(\d+).*?(\d{4})/.exec(event_date);
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = Number(m[2]);
  const year = Number(m[3]);
  return `${year}-${pad(month + 1)}-${pad(day)}T${timeOf(time_start, '09:00:00')}`;
}

// Pull the clock out of a time_start/time_end field ("09:00" / "17:30:00"),
// falling back to `fallback` when the field is missing or malformed.
function timeOf(value: string | undefined, fallback: string): string {
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(value ?? '')) return fallback;
  return (value as string).length === 5 ? `${value}:00` : (value as string);
}

// Parse the LAST day out of a display date and return a local ISO datetime
// string. One pattern covers every shape in data/:
//   "April 14 – 15, 2026"            en dash, same month
//   "April 17 — 18, 2024"            em dash
//   "September 30 – October 1, 2026" range crossing a month
//   "September 4, 2025"              single day (no range at all)
// The end month/day fall back to the start's when the range half is absent, so a
// single-day event ends on the day it starts. time_end sets the clock; without
// one the event runs to the end of its last day.
//
// Falls back to end-of-day on the start date if the pattern doesn't match, so
// malformed input degrades to a one-day event instead of an undefined window.
function isoEndDate(
  event_date?: string,
  time_end?: string,
  startDate?: string,
): string | undefined {
  const endOfStartDay = startDate ? `${startDate.slice(0, 10)}T23:59:59` : undefined;
  if (!event_date) return undefined;
  const m =
    /^\s*([A-Za-z]+)\s+(\d{1,2})\s*(?:[–—-]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}))?\s*,\s*(\d{4})/.exec(
      event_date,
    );
  if (!m) return endOfStartDay;
  const startMonth = MONTHS.indexOf(m[1].toLowerCase());
  const endMonth = m[3] ? MONTHS.indexOf(m[3].toLowerCase()) : startMonth;
  if (startMonth < 0 || endMonth < 0) return endOfStartDay;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = Number(m[4] ?? m[2]);
  // A range whose end month sorts before its start month has crossed New Year.
  const year = Number(m[5]) + (endMonth < startMonth ? 1 : 0);
  return `${year}-${pad(endMonth + 1)}-${pad(day)}T${timeOf(time_end, '23:59:59')}`;
}

function toSpeaker(s: ResolvedSpeaker): Speaker {
  return {
    name: s.name,
    position: s.position,
    photo: s.photo,
    hasPhoto: hasPhoto(s),
    badges: s.badges,
    urls: s.urls,
  };
}

// Resolve every slug reference in an event into concrete speaker objects.
function hydrateEvent(raw: RawEvent): EventItem {
  const slug = raw.slug;

  const speakers: Speaker[] = (raw.speakers ?? []).map((ref) =>
    toSpeaker(resolveSpeaker(slug, ref)),
  );

  // A session references its full talk by permalink (/events/talks/<talk-slug>);
  // pull the talk's description across so the agenda modal shows the real abstract.
  const talkDescBySlug = new Map<string, string>();
  for (const talk of raw.talks ?? []) {
    if (talk.slug && talk.description) talkDescBySlug.set(talk.slug, talk.description);
  }
  const talkSlugOf = (permalink?: string) =>
    permalink ? permalink.split('/').filter(Boolean).pop() : undefined;

  let agenda: AgendaByDate | undefined;
  if (raw.agenda) {
    agenda = {};
    for (const [date, categories] of Object.entries(raw.agenda)) {
      agenda[date] = {};
      for (const [category, sessions] of Object.entries(categories)) {
        agenda[date][category] = sessions.map((session) => {
          const refs: RawSpeakerRef[] =
            session.speakers ?? (session.speaker ? [session.speaker] : []);
          const resolved = refs.map((ref) => resolveSpeaker(slug, ref));
          const talkSlug = talkSlugOf(session.permalink);
          return {
            title: session.title,
            time: session.time,
            date: session.date,
            permalink: session.permalink,
            slidesUrl: session.slidesUrl,
            videoUrl: session.videoUrl,
            description: talkSlug ? talkDescBySlug.get(talkSlug) : undefined,
            speakers: resolved.map((s) => ({
              name: s.name,
              position: s.position,
              photo: s.photo,
              badges: s.badges,
              urls: s.urls,
              ...(s.tag ? { tag: s.tag } : {}),
            })),
          };
        });
      }
    }
  }

  const talks: EventTalk[] | undefined = raw.talks?.map((talk) => ({
    ...talk,
    speakers: (talk.speakers ?? []).map((ref) => toSpeaker(resolveSpeaker(slug, ref))),
  }));

  const startDate = raw.startDate ?? isoStartDate(raw.event_date, raw.time_start);
  const endDate = raw.endDate ?? isoEndDate(raw.event_date, raw.time_end, startDate);

  return { ...(raw as unknown as EventItem), startDate, endDate, speakers, agenda, talks };
}

// require.context — globs every data/<year>/<slug>/event.yaml as a raw
// string (see the Turbopack YAML rule) and bundles them, so it works for both the static
// export and the Cloudflare Worker build. The two [^/]+ segments are the year
// folder and the event folder.
type RawModule = string | { default: string };
const ctx = (
  require as unknown as {
    context(
      dir: string,
      recursive: boolean,
      re: RegExp,
    ): { keys(): string[]; (id: string): RawModule };
  }
).context('../../data', true, /^\.\/[^/]+\/[^/]+\/event\.ya?ml$/);

const allEvents: EventItem[] = ctx.keys().map((key) => {
  const mod = ctx(key);
  return hydrateEvent(yaml.load(typeof mod === 'string' ? mod : mod.default) as RawEvent);
});

// Parse "September 5 — 7, 2024" → sortable timestamp of the event's first day.
function dateValue(e: EventItem): number {
  const m = /([A-Za-z]+)\s+(\d+).*?(\d{4})/.exec(e.event_date);
  if (!m) return 0;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  return Date.UTC(Number(m[3]), month < 0 ? 0 : month, Number(m[2]));
}

const order = (yaml.load(rawOrder) as string[] | null) ?? [];
const orderIndex = new Map(order.map((slug, i) => [slug, i] as const));

// Order: events.order.yml first (its listed order), then everything else by
// date — past events most-recent-first, upcoming/active soonest-first.
export const events: EventItem[] = allEvents.sort((a, b) => {
  const ia = orderIndex.get(a.slug) ?? Infinity;
  const ib = orderIndex.get(b.slug) ?? Infinity;
  if (ia !== ib) return ia - ib;
  const bothFinished = a.status === 'finished' && b.status === 'finished';
  return bothFinished ? dateValue(b) - dateValue(a) : dateValue(a) - dateValue(b);
});

export function getEventBySlug(slug: string): EventItem | undefined {
  return events.find((e) => e.slug === slug);
}
