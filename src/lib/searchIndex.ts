import { events } from '@/lib/events';
import { sessionHref } from '@/lib/sessionKey';

/** A speaker as the search results render them (a subset of lib/events' Speaker). */
export interface SearchSpeaker {
  name: string;
  position: string;
  photo: string;
  badges?: string[];
}

/**
 * One row in the full-screen search. `type` picks the row layout in
 * SearchModal and, via TYPE_ORDER there, the group the row lands in — so the
 * fields below are grouped by which layout reads them.
 */
export interface SearchItem {
  type: 'event' | 'speaker' | 'talk' | 'page';
  title: string;
  permalink: string;
  /**
   * Everything the query is matched against, joined and lower-cased here so the
   * modal only lower-cases the query. It is wider than what the row shows —
   * talk abstracts and a speaker's events are searchable but not rendered.
   */
  keywords: string;
  /** page rows */
  description?: string;
  /** event rows */
  eventType?: string;
  date?: string;
  location?: string;
  /** speaker rows */
  position?: string;
  photo?: string;
  badges?: string[];
  /** talk rows */
  eventTitle?: string;
  time?: string;
  speakers?: SearchSpeaker[];
}

const kw = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(' ').toLowerCase();

export function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = [];

  for (const event of events) {
    items.push({
      type: 'event',
      title: event.title,
      permalink: event.permalink,
      eventType: event.type,
      date: event.event_date,
      location: event.location,
      keywords: kw(event.title, event.type, event.event_date, event.location, event.description),
    });
  }

  // Speakers are shared across events (the data/ registry keys them by slug), so
  // the same person would otherwise return one row per appearance. Collapse to
  // one row per name, keeping the first event they appear in as the link target
  // — there are no speaker pages yet — and folding the rest of their events into
  // the keywords so "Dimitri Amsterdam" still finds them.
  const speakerRows = new Map<string, SearchItem>();
  for (const event of events) {
    for (const speaker of event.speakers ?? []) {
      const existing = speakerRows.get(speaker.name);
      if (existing) {
        existing.keywords = kw(existing.keywords, event.title);
        continue;
      }
      speakerRows.set(speaker.name, {
        type: 'speaker',
        title: speaker.name,
        permalink: event.permalink,
        position: speaker.position,
        photo: speaker.photo,
        badges: speaker.badges,
        keywords: kw(speaker.name, speaker.position, speaker.badges?.join(' '), event.title),
      });
    }
  }
  items.push(...speakerRows.values());

  // Talks open as a session modal on their own event page rather than on the
  // standalone /events/talks/<slug> page, which showed the talk stripped of its
  // event context. A session's key is its talk slug, so the link is direct.
  for (const event of events) {
    for (const talk of event.talks ?? []) {
      items.push({
        type: 'talk',
        title: talk.title,
        permalink: sessionHref(event.permalink, talk.slug),
        eventTitle: event.title,
        time: talk.time,
        speakers: (talk.speakers ?? []).map((s) => ({
          name: s.name,
          position: s.position,
          photo: s.photo,
          badges: s.badges,
        })),
        keywords: kw(
          talk.title,
          talk.description,
          event.title,
          (talk.speakers ?? []).map((s) => `${s.name} ${s.position}`).join(' '),
        ),
      });
    }
  }

  items.push(
    {
      type: 'page',
      title: 'OpenAPI Events',
      description: 'Home',
      permalink: '/',
      keywords: kw('OpenAPI Events home'),
    },
    {
      type: 'page',
      title: 'Past Events',
      description: 'Archive',
      permalink: '/past-events',
      keywords: kw('Past Events archive'),
    },
  );

  return items;
}
