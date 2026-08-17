import {
  events,
  type AgendaByDate,
  type AgendaSession,
  type AgendaSpeaker,
  type Sponsor,
} from './events';

// Detail-page data now lives in data/events.yml (per event). This module only
// adapts an event into the shape the EventDetail component expects.
export type { AgendaByDate, AgendaSession, AgendaSpeaker };

export interface EventDetailData {
  title: string;
  date: string;
  location: string;
  image: string;
  type: string;
  status: 'active' | 'upcoming' | 'finished';
  description?: string;
  agenda?: AgendaByDate;
  sponsors?: Sponsor[];
  metaTitle?: string;
  metaDescription?: string;
}

export function getEventDetail(slug: string): EventDetailData | undefined {
  const event = events.find((e) => e.slug === slug);
  if (!event) return undefined;
  return {
    title: event.title,
    date: event.event_date,
    location: event.location,
    image: event.image,
    type: event.type,
    status: event.status,
    description: event.description,
    agenda: event.agenda,
    sponsors: event.sponsors,
    metaTitle: event.metaTitle,
    metaDescription: event.metaDescription,
  };
}

export function getAllEventSlugs(): string[] {
  return events.map((e) => e.slug);
}
