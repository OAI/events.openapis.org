import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EventDetail from '@/components/EventDetail';
import { getAllEventSlugs, getEventDetail } from '@/lib/eventDetails';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllEventSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = getEventDetail(slug);
  if (!detail) return { title: 'Event not found' };
  const title = detail.metaTitle ?? detail.title;
  const description = detail.metaDescription ?? detail.description;
  const url = `/events/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      images: detail.image
        ? [{ url: detail.image, width: 1200, height: 630, alt: detail.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: detail.image ? [detail.image] : undefined,
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = getEventDetail(slug);
  if (!detail) notFound();

  return (
    <EventDetail
      title={detail.title}
      date={detail.date}
      location={detail.location}
      image={detail.image}
      type={detail.type}
      status={detail.status}
      description={detail.description}
      agenda={detail.agenda}
      sponsors={detail.sponsors}
    />
  );
}
