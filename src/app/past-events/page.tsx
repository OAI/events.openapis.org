import type { Metadata } from 'next';
import PastEventsList from '@/components/PastEventsList';
import { events } from '@/lib/events';
import { pastEvents } from '@/lib/pastEvents';

export const metadata: Metadata = {
  title: 'Past Events',
  description: 'OpenAPI past events and conferences',
  alternates: { canonical: '/past-events' },
  openGraph: {
    title: 'Past Events',
    description: 'OpenAPI past events and conferences',
    type: 'website',
    url: '/past-events',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Past Events',
    description: 'OpenAPI past events and conferences',
  },
};

export default function PastEventsPage() {
  const mapEvent = (event: (typeof events)[number]) => ({
    title: event.title,
    permalink: event.permalink,
    date: event.event_date,
    location: event.location,
    type: event.type,
    status: event.status,
    image: event.image,
    startDate: event.startDate,
    endDate: event.endDate,
    speakers: event.speakers,
  });

  const items = pastEvents.map(mapEvent);
  const scheduledItems = events.filter((event) => event.status !== 'finished').map(mapEvent);

  return <PastEventsList items={items} scheduledItems={scheduledItems} />;
}
