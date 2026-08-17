import { events, type ScheduleSlot, type TalkSpeaker } from './events';

// Talk data now lives nested under each event in data/events.yml. This module
// flattens it for the talk pages, deriving eventTitle/eventDate from the parent.
export type { ScheduleSlot, TalkSpeaker };

export interface TalkData {
  title: string;
  description: string;
  time?: string;
  category?: string;
  eventTitle?: string;
  eventDate?: string;
  // Parent event permalink (`/events/<slug>`). The talk pages redirect here,
  // to the same session opened as a modal in its event context.
  eventPermalink?: string;
  speakers?: TalkSpeaker[];
  schedule?: ScheduleSlot[];
  slidesUrl?: string;
  videoUrl?: string;
  metaTitle?: string;
}

export function getTalk(slug: string): TalkData | undefined {
  for (const event of events) {
    const talk = event.talks?.find((t) => t.slug === slug);
    if (talk) {
      return {
        title: talk.title,
        description: talk.description,
        time: talk.time,
        category: talk.category,
        eventTitle: event.title,
        eventDate: event.event_date,
        eventPermalink: event.permalink,
        speakers: talk.speakers,
        schedule: talk.schedule,
        slidesUrl: talk.slidesUrl,
        videoUrl: talk.videoUrl,
        metaTitle: talk.metaTitle,
      };
    }
  }
  return undefined;
}

export function getAllTalkSlugs(): string[] {
  return events.flatMap((e) => (e.talks ?? []).map((t) => t.slug));
}
