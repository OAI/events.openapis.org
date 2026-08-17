import { events, type EventItem } from './events';

export type { EventItem };

export const pastEvents: EventItem[] = events.filter((e) => e.status === 'finished');
