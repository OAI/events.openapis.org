import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SpeakerDetail from '@/components/SpeakerDetail';
import { hasPhoto } from '@/lib/avatarPlaceholder';
import { getAllSpeakerSlugs, getSpeakerDetail } from '@/lib/speakerDetails';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllSpeakerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const speaker = getSpeakerDetail(slug);
  if (!speaker) return { title: 'Speaker not found' };
  const title = speaker.name;
  const description = speaker.description ?? speaker.position;
  const url = `/speakers/${slug}`;
  // Only a real portrait is worth sharing — the neutral placeholder would make
  // every photo-less speaker's card look like the same person.
  const image = hasPhoto(speaker) ? speaker.photo : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'profile',
      url,
      images: image ? [{ url: image, alt: speaker.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SpeakerPage({ params }: PageProps) {
  const { slug } = await params;
  const speaker = getSpeakerDetail(slug);
  if (!speaker) notFound();

  return (
    <SpeakerDetail
      name={speaker.name}
      position={speaker.position}
      photo={speaker.photo}
      description={speaker.description}
      badges={speaker.badges}
      urls={speaker.urls}
      appearances={speaker.appearances}
    />
  );
}
