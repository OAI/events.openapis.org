import React from 'react';
import Link from 'next/link';
import { asset } from '@/lib/basePath';

interface Speaker {
  name: string;
  position: string;
  photo: string;
}

interface AgendaItemProps {
  timeStart: string;
  timeEnd: string;
  title: string;
  speakers: Speaker[];
  permalink?: string;
}

function TimeRange({ start, end }: { start: string; end: string }) {
  return (
    <div className="flex flex-row items-center gap-6 py-2">
      <div className="h-[10px] w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
      <span className="font-onest text-lg font-normal leading-[120%] tracking-oai text-white">
        {start}
      </span>
      <div className="h-px flex-1 bg-brand-separator" />
      <span className="font-onest text-lg font-normal leading-[120%] tracking-oai text-white">
        {end}
      </span>
    </div>
  );
}

function SpeakerDetail({ speaker }: { speaker: Speaker }) {
  return (
    <div className="flex flex-row items-center gap-3">
      <div
        className="h-16 w-16 flex-shrink-0 bg-[#D9D9D9] bg-cover bg-center"
        style={{
          backgroundImage: `url(${asset(speaker.photo)})`,
          borderRadius: '8px 32px 32px 8px',
        }}
      />
      <div className="flex flex-col justify-center gap-1">
        <span className="font-onest text-base font-bold leading-[120%] tracking-oai text-white">
          {speaker.name}
        </span>
        <span className="font-onest text-base font-normal leading-[120%] tracking-oai text-white">
          {speaker.position}
        </span>
      </div>
    </div>
  );
}

export default function AgendaItem({
  timeStart,
  timeEnd,
  title,
  speakers,
  permalink,
}: AgendaItemProps) {
  const content = (
    <div className="flex flex-col items-start justify-between gap-6 rounded-4xl bg-brand-bg bg-gradient-to-t from-white/[0.04] to-white/[0.04] p-6 transition-all hover:from-white/[0.08] hover:to-white/[0.08] md:flex-row md:gap-20 md:px-20 md:py-12">
      {/* Main content */}
      <div className="flex max-w-[800px] flex-1 flex-col gap-4">
        <h3 className="m-0 font-onest text-2xl font-bold leading-[120%] tracking-oai text-white md:text-[32px]">
          {title}
        </h3>
        {/* Speaker info */}
        {speakers.length > 0 && (
          <div className="flex flex-row items-center gap-5 md:gap-7">
            <div className="h-6 w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
            <div className="flex flex-col items-start gap-6 md:flex-row">
              {speakers.map((s) => (
                <SpeakerDetail key={s.name} speaker={s} />
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Time */}
      <div className="w-full flex-shrink-0 md:w-[240px]">
        <TimeRange start={timeStart} end={timeEnd} />
      </div>
    </div>
  );

  if (permalink) {
    return (
      <Link href={permalink} className="block no-underline hover:no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
