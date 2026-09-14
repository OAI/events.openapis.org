import React from 'react';
import Link from 'next/link';
import OaiFooter from '../OaiFooter';
import SpeakerBadge from '../SpeakerBadge';
import SpeakerLinks from '../SpeakerLinks';
import { asset } from '@/lib/basePath';
import { hasPhoto } from '@/lib/avatarPlaceholder';
import type { SpeakerAppearance } from '@/lib/speakerDetails';
import type { SpeakerLink } from '@/lib/speakers';

interface SpeakerDetailProps {
  name: string;
  position: string;
  photo: string;
  description?: string;
  badges?: string[];
  urls?: SpeakerLink[];
  appearances: SpeakerAppearance[];
}

const GREEN = '#5cb300';

export default function SpeakerDetail({
  name,
  position,
  photo,
  description,
  badges = [],
  urls,
  appearances,
}: SpeakerDetailProps) {
  const portrait = hasPhoto({ photo });

  return (
    <main data-flat-bg className="min-h-screen bg-brand-bg">
      {/* Identity band — portrait, name, position, links, bio */}
      <section className="px-4 pt-10 md:pt-24">
        <div className="mx-auto flex w-full flex-col items-center gap-6 md:w-[800px] md:gap-10">
          <div className="relative flex items-center justify-center">
            {portrait && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cover bg-center opacity-[0.48] blur-[60px] md:h-[320px] md:w-[320px] md:blur-[120px]"
                style={{ backgroundImage: `url(${asset(photo)})` }}
              />
            )}
            <div
              role="img"
              aria-label={name}
              className={`relative h-[120px] w-[120px] rounded-full bg-cover bg-center md:h-[240px] md:w-[240px] ${
                portrait ? '' : 'avatar-placeholder'
              }`}
              style={portrait ? { backgroundImage: `url(${asset(photo)})` } : undefined}
            />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex flex-row flex-wrap items-center justify-center gap-2">
              <h1 className="font-onest text-[28px] font-bold leading-[32px] tracking-[-1px] text-[#15191c] md:text-[48px] md:leading-[56px] [[data-theme=dark]_&]:text-[#f6f6f6]">
                {name}
              </h1>
              {badges.map((b) => (
                <SpeakerBadge key={b} label={b} />
              ))}
            </div>
            {position && (
              <p className="font-onest text-sm font-normal leading-[22px] tracking-oai text-[rgba(21,25,28,0.64)] md:text-base md:leading-6 [[data-theme=dark]_&]:text-[#abacad]">
                {position}
              </p>
            )}
          </div>

          {urls && urls.length > 0 && (
            <div className="flex flex-row items-center gap-16">
              <SpeakerLinks
                name={name}
                urls={urls}
                size={48}
                className="flex h-12 w-12 items-center justify-center text-[#15191c] transition-colors hover:text-brand-green active:text-brand-green-pressed [[data-theme=dark]_&]:text-[#f6f6f6] [[data-theme=dark]_&]:hover:text-brand-green [[data-theme=dark]_&]:active:text-brand-green-pressed"
              />
            </div>
          )}

          {description && (
            <p className="w-full font-onest text-base font-normal leading-6 tracking-oai text-[rgba(21,25,28,0.8)] md:text-lg md:leading-[26px] [[data-theme=dark]_&]:text-[#c8c9ca]">
              {description}
            </p>
          )}
        </div>
      </section>

      {/* On stage at — every session and event this person appears on */}
      <section className="px-4 pb-20 pt-6 md:pt-40">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 md:gap-10">
          <h2 className="text-center font-onest text-[36px] font-bold leading-[44px] tracking-[-1px] text-[#15191c] md:text-[48px] md:leading-[56px] [[data-theme=dark]_&]:text-[#f6f6f6]">
            On stage at
          </h2>

          <div className="flex flex-col gap-2 md:gap-6">
            {appearances.map((a) => {
              const upcoming = a.status !== 'finished';
              // With no session title the card is headed by the event itself, so
              // repeating the event name in the meta column would say it twice.
              const showEventName = !!a.sessionTitle;
              const showDate = !showEventName || upcoming;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="tile-press flex w-full flex-col items-start gap-4 rounded-[40px] bg-white p-6 no-underline transition-colors hover:bg-white/90 md:flex-row md:items-start md:justify-between md:px-20 md:py-12 [[data-theme=dark]_&]:bg-[#1e2225] [[data-theme=dark]_&]:hover:bg-[#1e2225]/90"
                >
                  <div className="flex min-w-px flex-col gap-4 md:max-w-[800px] md:flex-[1_0_0]">
                    {upcoming && (
                      <span
                        className="font-onest text-base font-normal leading-6 tracking-oai"
                        style={{ color: GREEN }}
                      >
                        Upcoming
                      </span>
                    )}
                    <h3
                      className={`font-onest text-2xl font-bold leading-8 tracking-oai md:text-[32px] md:leading-10 md:tracking-[-1px] ${
                        upcoming
                          ? 'text-[#15191c] [[data-theme=dark]_&]:text-[#f6f6f6]'
                          : 'text-[rgba(21,25,28,0.48)] [[data-theme=dark]_&]:text-[#abacad]'
                      }`}
                    >
                      {a.sessionTitle ?? a.eventTitle}
                    </h3>
                  </div>

                  <div className="flex min-w-px flex-row items-center gap-6 self-stretch md:max-w-[240px] md:flex-[1_0_0]">
                    <div
                      className="h-[10px] w-[5px] flex-shrink-0 rounded-[10px]"
                      style={{ backgroundColor: upcoming ? GREEN : '#696c6e' }}
                    />
                    <div className="flex flex-col gap-0.5">
                      {showEventName && (
                        <span
                          className={`font-onest text-sm font-bold leading-6 tracking-oai md:text-base ${
                            upcoming
                              ? 'text-[#15191c] [[data-theme=dark]_&]:text-[#f6f6f6]'
                              : 'text-[rgba(21,25,28,0.4)] [[data-theme=dark]_&]:text-[#696c6e]'
                          }`}
                        >
                          {a.eventTitle}
                        </span>
                      )}
                      {showDate && (
                        <span className="font-onest text-sm font-normal leading-[22px] tracking-oai text-[rgba(21,25,28,0.4)] md:text-base md:leading-6 [[data-theme=dark]_&]:text-[#696c6e]">
                          {a.eventDate}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link
            href="/events"
            className="btn-green inline-flex h-[56px] w-full items-center justify-between gap-2.5 whitespace-nowrap rounded-[20px] px-6 py-1.5 font-onest text-base font-bold leading-[1.2] tracking-oai text-[#15191c] no-underline transition-colors duration-200 md:ml-20 md:h-[64px] md:w-auto md:justify-center md:self-start md:text-lg"
          >
            Events
            <img src={asset('/img/shevron_icon.svg')} alt="" aria-hidden className="h-4 w-auto" />
          </Link>
        </div>
      </section>

      <OaiFooter />
    </main>
  );
}
