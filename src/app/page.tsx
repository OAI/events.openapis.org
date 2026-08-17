import type { Metadata } from 'next';
import EventsList from '@/components/EventsList';
import { events } from '@/lib/events';

export const metadata: Metadata = {
  title: 'OpenAPI Events',
  description: 'OpenAPI events and conferences',
};

export default function Home() {
  const mapEvent = (event: (typeof events)[number]) => ({
    title: event.title,
    permalink: event.permalink,
    date: event.event_date,
    location: event.location,
    type: event.type,
    status: event.status,
    image: event.image,
    startDate: event.startDate,
    speakers: event.speakers,
  });

  const eventItems = events
    .filter((event) => event.status === 'active' || event.status === 'upcoming')
    .map(mapEvent);

  const pastItems = events.filter((event) => event.status === 'finished').map(mapEvent);

  return <EventsList items={eventItems} pastItems={pastItems} />;
}
