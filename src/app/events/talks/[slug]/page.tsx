import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TalkDetail from '@/components/TalkDetail';
import TalkRedirect from '@/components/TalkRedirect';
import { getAllTalkSlugs, getTalk } from '@/lib/talks';
import { sessionHref } from '@/lib/sessionKey';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllTalkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const talk = getTalk(slug);
  if (!talk) return { title: 'Talk not found' };
  const title = talk.metaTitle ?? talk.title;
  const description = talk.description;
  // Point canonical at the event page, since that is where this URL redirects
  // to and where the session actually lives now.
  const url = talk.eventPermalink
    ? sessionHref(talk.eventPermalink, slug)
    : `/events/talks/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function TalkPage({ params }: PageProps) {
  const { slug } = await params;
  const talk = getTalk(slug);
  if (!talk) notFound();

  return (
    <>
      {talk.eventPermalink && <TalkRedirect href={sessionHref(talk.eventPermalink, slug)} />}
      <TalkDetail
        title={talk.title}
        description={talk.description}
        time={talk.time}
        category={talk.category}
        speakers={talk.speakers}
        eventTitle={talk.eventTitle}
        eventDate={talk.eventDate}
        schedule={talk.schedule}
        slidesUrl={talk.slidesUrl}
        videoUrl={talk.videoUrl}
      />
    </>
  );
}
