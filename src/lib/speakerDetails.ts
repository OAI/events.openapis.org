import { events, type EventItem } from './events';
import { sessionHref, sessionKey } from './sessionKey';
import { resolveSpeaker, type ResolvedSpeaker } from './speakers';

export interface SpeakerAppearance {
  eventTitle: string;
  eventDate: string;
  eventPermalink: string;
  status: EventItem['status'];
  sessionTitle?: string;
  href: string;
}

export interface SpeakerDetail extends ResolvedSpeaker {
  appearances: SpeakerAppearance[];
}

/** `/events/foo` -> `/events/foo/` — the site runs with trailingSlash: true. */
function withSlash(permalink: string): string {
  return permalink.endsWith('/') ? permalink : `${permalink}/`;
}

function byRecency(a: EventItem, b: EventItem): number {
  const aOpen = a.status !== 'finished';
  const bOpen = b.status !== 'finished';
  if (aOpen !== bOpen) return aOpen ? -1 : 1;
  const av = a.startDate ?? '';
  const bv = b.startDate ?? '';
  return aOpen ? av.localeCompare(bv) : bv.localeCompare(av);
}

interface Index {
  appearances: Map<string, SpeakerAppearance[]>;
  identityEvent: Map<string, string>;
}

// Built once at module scope, like the event and speaker registries themselves.
const index: Index = (() => {
  const appearances = new Map<string, SpeakerAppearance[]>();
  const seenHref = new Map<string, Set<string>>();
  const identityEvent = new Map<string, string>();
  const identityDate = new Map<string, string>();

  const add = (slug: string, appearance: SpeakerAppearance) => {
    let hrefs = seenHref.get(slug);
    if (!hrefs) seenHref.set(slug, (hrefs = new Set()));
    if (hrefs.has(appearance.href)) return;
    hrefs.add(appearance.href);
    const list = appearances.get(slug);
    if (list) list.push(appearance);
    else appearances.set(slug, [appearance]);
  };

  for (const event of [...events].sort(byRecency)) {
    const base = {
      eventTitle: event.title,
      eventDate: event.event_date,
      eventPermalink: event.permalink,
      status: event.status,
    };
    const eventHref = withSlash(event.permalink);
    const onThisEvent = new Set<string>();

    const note = (slug: string) => {
      onThisEvent.add(slug);
      const date = event.startDate ?? '';
      if (date >= (identityDate.get(slug) ?? '')) {
        identityDate.set(slug, date);
        identityEvent.set(slug, event.slug);
      }
    };

    for (const categories of Object.values(event.agenda ?? {})) {
      for (const sessions of Object.values(categories)) {
        for (const session of sessions) {
          const href = sessionHref(event.permalink, sessionKey(session));
          for (const speaker of session.speakers ?? []) {
            note(speaker.slug);
            add(speaker.slug, { ...base, sessionTitle: session.title, href });
          }
        }
      }
    }

    for (const talk of event.talks ?? []) {
      const href = sessionHref(event.permalink, talk.slug);
      for (const speaker of talk.speakers ?? []) {
        note(speaker.slug);
        add(speaker.slug, { ...base, sessionTitle: talk.title, href });
      }
    }

    for (const speaker of event.speakers) {
      const known = onThisEvent.has(speaker.slug);
      note(speaker.slug);
      if (!known) add(speaker.slug, { ...base, href: eventHref });
    }
  }

  return { appearances, identityEvent };
})();

export function getSpeakerDetail(slug: string): SpeakerDetail | undefined {
  const appearances = index.appearances.get(slug);
  const eventSlug = index.identityEvent.get(slug);
  if (!appearances?.length || !eventSlug) return undefined;
  return { ...resolveSpeaker(eventSlug, slug), appearances };
}

export function getAllSpeakerSlugs(): string[] {
  return [...index.appearances.keys()];
}
