import React from 'react';
import Link from 'next/link';
import OaiFooter from '../OaiFooter';
import { asset } from '@/lib/basePath';

interface Speaker {
  name: string;
  position: string;
  photo: string;
}

interface ScheduleSlot {
  time: string;
  title: string;
  permalink: string;
}

interface TalkDetailProps {
  title: string;
  description: string;
  time?: string;
  category?: string;
  speakers?: Speaker[];
  eventTitle?: string;
  eventDate?: string;
  schedule?: ScheduleSlot[];
  slidesUrl?: string;
  videoUrl?: string;
}

export default function TalkDetail({
  title,
  description,
  time,
  speakers = [],
  schedule = [],
  slidesUrl,
  videoUrl,
}: TalkDetailProps) {
  const [startTime, endTime] = time ? time.split(/\s*[—-]\s*/) : ['', ''];

  return (
    <main className="min-h-screen bg-brand-bg">
      <section className="relative pb-12 pt-16 md:pb-20 md:pt-24">
        <div className="mx-auto max-w-[1408px] px-6 md:px-[104px]">
          {/* White content card — matches the Figma "Description Layer" modal */}
          <div className="rounded-[40px] bg-white px-6 py-8 md:px-20 md:py-12">
            <div className="flex max-w-[800px] flex-col gap-6">
              {/* Top group: time row + title */}
              <div className="flex flex-col gap-8 md:gap-12">
                {/* Time row */}
                {time && (
                  <div className="flex max-w-[240px] items-center gap-6 py-2">
                    <div className="h-[10px] w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
                    <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] md:text-lg">
                      {startTime}
                    </span>
                    <div className="h-px flex-1 bg-[rgba(21,25,28,0.12)]" />
                    <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] md:text-lg">
                      {endTime}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h1 className="m-0 font-onest text-[32px] font-bold leading-[1.1] tracking-oai text-[#15191c] md:text-[48px] md:leading-[1.1] md:tracking-[-1.92px]">
                  {title}
                </h1>
              </div>

              {/* Description */}
              {description && (
                <p className="m-0 font-onest text-base font-normal leading-[1.4] tracking-oai text-[#15191c] md:text-lg">
                  {description}
                </p>
              )}

              {/* Speakers section */}
              {speakers.length > 0 && (
                <div className="pt-8 md:pt-12">
                  <div className="flex items-center gap-[27px]">
                    <div className="h-6 w-[5px] flex-shrink-0 self-stretch rounded-[10px] bg-brand-green" />
                    <div className="flex flex-1 flex-col gap-4">
                      {speakers.map((speaker) => (
                        <div key={speaker.name} className="flex items-center gap-6">
                          <div className="flex flex-1 items-center gap-3">
                            {speaker.photo ? (
                              <img
                                src={asset(speaker.photo)}
                                alt={speaker.name}
                                className="h-16 w-16 flex-shrink-0 rounded-bl-[8px] rounded-br-[32px] rounded-tl-[8px] rounded-tr-[32px] object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 flex-shrink-0 rounded-bl-[8px] rounded-br-[32px] rounded-tl-[8px] rounded-tr-[32px] bg-[#d9d9d9]" />
                            )}
                            <div className="flex min-w-0 flex-col gap-1">
                              <span className="font-onest text-base font-bold leading-[1.2] tracking-oai text-[#15191c]">
                                {speaker.name}
                              </span>
                              {speaker.position && (
                                <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c]">
                                  {speaker.position}
                                </span>
                              )}
                            </div>
                          </div>
                          <a
                            href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(speaker.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center text-[#15191c] transition-colors hover:text-brand-green"
                            aria-label={`LinkedIn — ${speaker.name}`}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 0 1 2.063-2.065 2.062 2.062 0 0 1 2.062 2.065 2.062 2.062 0 0 1-2.062 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Slides / recording buttons — shown only when a link exists.
                  If neither is available, a disabled "View slides" button keeps
                  the card's original shape. */}
              <div className="flex flex-col gap-3 pt-3 md:flex-row">
                {slidesUrl ? (
                  <a
                    href={slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-green inline-flex h-[56px] w-full cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[#15191c] no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(101,209,0,0.4)] active:translate-y-0 active:shadow-none md:h-[64px] md:w-auto md:px-6 md:text-lg"
                  >
                    View slides
                  </a>
                ) : (
                  !videoUrl && (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Slides not available"
                      className="inline-flex h-[56px] w-full cursor-not-allowed items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none bg-[rgba(21,25,28,0.12)] px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[rgba(21,25,28,0.4)] md:h-[64px] md:w-auto md:px-6 md:text-lg"
                    >
                      View slides
                    </button>
                  )
                )}
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[56px] w-full cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-2 border-[#15191c] bg-transparent px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[#15191c] no-underline transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 md:h-[64px] md:w-auto md:px-6 md:text-lg"
                  >
                    Watch recording
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline below the card — grouped pills, scrollable on mobile */}
      {schedule.length > 0 && (
        <section className="w-full overflow-x-auto pb-12">
          <div className="mx-auto flex min-w-max max-w-[1408px] items-center justify-start gap-3 px-6 md:justify-center md:px-[104px]">
            <div className="inline-flex items-center rounded-[20px] bg-[rgba(21,25,28,0.08)]">
              {schedule.map((slot) => {
                const isCurrentTalk = slot.time === startTime;
                return (
                  <Link
                    key={`${slot.time}-${slot.permalink}`}
                    href={slot.permalink}
                    className={`flex h-10 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-[20px] px-5 py-2 font-onest text-base font-semibold tracking-oai no-underline transition-colors ${
                      isCurrentTalk
                        ? 'bg-brand-green text-[#15191c]'
                        : 'bg-transparent text-[rgba(21,25,28,0.64)] hover:text-[#15191c]'
                    }`}
                  >
                    {slot.time}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <OaiFooter />
    </main>
  );
}
