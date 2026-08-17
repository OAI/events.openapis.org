'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import EventCard from '../EventCard';
import { asset } from '@/lib/basePath';
import SpeakerCard from '../SpeakerCard';
import OaiFooter from '../OaiFooter';
import PhotoLightbox from '../PhotoLightbox';
import { galleryPhotos, galleryPhotoSrcs, tileWidth } from '@/lib/galleryPhotos';

interface Speaker {
  name: string;
  position: string;
  photo: string;
  badges?: string[];
}

interface EventItem {
  title: string;
  permalink: string;
  date: string;
  location: string;
  type: string;
  status: string;
  image: string;
  startDate?: string;
  speakers: Speaker[];
}

interface EventsListProps {
  items: EventItem[];
  pastItems?: EventItem[];
}

export default function EventsList({ items, pastItems = [] }: EventsListProps) {
  const [showPast, setShowPast] = useState(false);

  // Separate featured (active) from other events
  const featured = items.find((i) => i.status === 'active') || items[0];
  const otherEvents = items.filter((i) => i !== featured);

  // Collect all unique speakers
  const allSpeakers = items.reduce<Speaker[]>((acc, item) => {
    for (const s of item.speakers) {
      if (!acc.some((existing) => existing.name === s.name)) {
        acc.push(s);
      }
    }
    return acc;
  }, []);

  // The two marquee rows draw from disjoint halves, so the same person is never
  // on screen twice. Each row then repeats its own half up to MARQUEE_MIN cards
  // (one copy must stay wider than the viewport or the loop shows a gap) and is
  // tripled, because the marquee keyframes translate by exactly -33.333%.
  const MARQUEE_MIN = 8;
  const marqueeTrack = (row: Speaker[]): Speaker[] => {
    if (row.length === 0) return [];
    const copies = Math.ceil(MARQUEE_MIN / row.length);
    const base = Array.from({ length: copies }, () => row).flat();
    return [...base, ...base, ...base];
  };
  const splitAt = Math.ceil(allSpeakers.length / 2);
  const speakersRow1 = marqueeTrack(allSpeakers.slice(0, splitAt));
  const speakersRow2 = marqueeTrack(allSpeakers.slice(splitAt));

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Scroll-driven hero expansion
  const heroRef = useRef<HTMLDivElement>(null);
  const initialHeightRef = useRef<number>(0);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.innerWidth < 1024) return;

    if (initialHeightRef.current === 0) {
      initialHeightRef.current = hero.offsetHeight;
    }

    const scroller = document.getElementById('scroll-root');
    let rafId: number;
    let lastScrollY = -1;
    const tick = () => {
      const scrollY = scroller ? scroller.scrollTop : document.documentElement.scrollTop;
      if (scrollY !== lastScrollY) {
        lastScrollY = scrollY;
        const extra = Math.min(scrollY * 0.3, 300);
        hero.style.minHeight = `${initialHeightRef.current + extra}px`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-brand-bg">
        {/* Hero Section */}
        <section ref={heroRef} className="relative pb-12 pt-16 md:pb-20 md:pt-[140px]">
          {/* Hero ignores the 80px text inset on the left — it sits at the 24px
              column edge (like the cards), keeping the 104px inset on the right. */}
          <div className="relative z-10 mx-auto max-w-[1408px] pl-2 pr-6 md:pl-6 md:pr-[104px]">
            {/* Frame 2147256185 — flex row, items-center, gap 75px, frame height 180px */}
            <div className="flex flex-row items-center gap-3 md:h-[180px] md:gap-[75px]">
              {/* Green vertical accent bar with entrance animation */}
              <div className="animate-slide-down block h-[80px] w-[4px] flex-shrink-0 rounded-[10px] bg-brand-green md:w-[5px]" />
              <div className="flex-1">
                {/* Heading with entrance animation */}
                <h1 className="animate-fade-in-up m-0 font-onest text-[40px] font-bold leading-[120%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[80px] md:leading-[0.96]">
                  OpenAPI events
                </h1>
                {/* Subtitle with staggered entrance animation */}
                <p className="animate-fade-in-up animation-delay-200 m-0 mt-2 max-w-[1200px] font-onest text-[24px] font-medium leading-[120%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[32px] md:font-normal">
                  Join the OpenAPI Conference, where we bring the latest OpenAPI innovations to
                  audiences around the world
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Section — the 1360px content column. max-w-[1408px] + md:px-6
            keeps the column 1360px wide while holding a 24px desktop safe-space
            on both sides (1408 = 1360 + 2×24); it shrinks to preserve that gutter
            on narrower desktops. */}
        <section className="relative z-10 mx-auto mb-12 max-w-[1408px] md:px-6">
          {/* Section headings and standalone buttons sit at md:px-20 (80px) inside
              the column — the same left edge as the featured card's content and its
              "Get a free ticket" button, which are inset 80px inside the card. */}
          <h2 className="m-0 mb-10 px-6 font-onest text-[32px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:px-20 md:text-[48px]">
            Upcoming
          </h2>

          {/* Featured Event — fills the full 1360 content column */}
          {featured && (
            <div className="mb-6">
              <EventCard
                title={featured.title}
                date={featured.date}
                location={featured.location}
                image={featured.image}
                type={featured.type}
                permalink={featured.permalink}
                status={featured.status as 'active' | 'upcoming' | 'finished'}
                startDate={featured.startDate}
                featured
              />
            </div>
          )}

          {/* Become a Speaker — MOBILE ONLY, directly under the featured card
              (aligned with the card's content at 24px). On desktop it instead sits
              below the Featured Speakers marquee. */}
          <div className="mb-10 px-6 md:hidden">
            <a
              href="#"
              aria-label="Become a Speaker"
              className="inline-flex items-center gap-3 text-brand-green no-underline transition-colors hover:text-brand-green-dark"
            >
              <svg
                aria-hidden
                width="30"
                height="28"
                viewBox="0 0 61 56"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path d="M 15.4 10.0 A 22 22 0 0 1 40.6 10.0 L 35.5 17.0 A 14 14 0 0 0 20.5 17.0 Z" />
                <path d="M 46.0 15.4 A 22 22 0 0 1 46.0 40.6 L 39.0 35.5 A 14 14 0 0 0 39.0 20.5 Z" />
                <path d="M 40.6 46.0 A 22 22 0 0 1 15.4 46.0 L 20.5 39.0 A 14 14 0 0 0 35.5 39.0 Z" />
                <path d="M 10.0 40.6 A 22 22 0 0 1 10.0 15.4 L 17.0 20.5 A 14 14 0 0 0 17.0 35.5 Z" />
                <circle cx="52" cy="9" r="4.2" />
              </svg>
              <span className="font-onest text-[18px] font-bold leading-[1.2] tracking-oai">
                Become a Speaker
              </span>
            </a>
          </div>

          {/* Other Events Grid — edge-to-edge on mobile, padded on desktop */}
          {otherEvents.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {otherEvents.map((item) => (
                <EventCard
                  key={item.permalink}
                  title={item.title}
                  date={item.date}
                  location={item.location}
                  image={item.image}
                  type={item.type}
                  permalink={item.permalink}
                  status={item.status as 'active' | 'upcoming' | 'finished'}
                />
              ))}

              {/* "New events soon" placeholder — radius matches the event cards
                  (rounded-4xl). The calendar replaces a ✦ sparkle, which now
                  reads as an AI glyph. -mt-2 offsets the cap-height gap above
                  the label so the icon/text pair sits optically centred rather
                  than sagging low. */}
              <div className="flex h-[340px] flex-col items-center justify-center rounded-4xl bg-[rgba(21,25,28,0.08)] md:h-[375px] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.08)]">
                <div className="-mt-2 flex flex-col items-center text-[#15191c]/[0.08] [[data-theme=dark]_&]:text-white/[0.16]">
                  <svg
                    aria-hidden
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-4"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                  <span className="text-center font-onest text-[36px] font-bold leading-[120%] tracking-oai">
                    New events soon
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Past events button — sits below the events grid at md:px-20 */}
          <div className="mt-10 px-6 md:mt-20 md:px-20">
            {/* Mobile: link to /past-events */}
            <Link
              href="/past-events"
              className="btn-green inline-flex h-[56px] w-full items-center justify-between gap-2.5 whitespace-nowrap rounded-[20px] px-6 py-1.5 font-onest text-lg font-bold leading-[120%] tracking-oai text-[#15191c] no-underline transition-colors duration-200 md:hidden"
            >
              Past events
              <img src={asset('/img/shevron_icon.svg')} alt="" aria-hidden className="h-4 w-auto" />
            </Link>
            {/* Desktop: toggle inline */}
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              className="btn-green hidden h-[64px] w-[159px] cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none px-6 py-1.5 font-onest text-lg font-bold leading-[120%] tracking-oai text-[#15191c] transition-colors duration-200 md:inline-flex"
            >
              {showPast ? 'Hide past' : 'Past events'}
              <img
                src={asset('/img/shevron_icon.svg')}
                alt=""
                aria-hidden
                className={`h-4 w-auto transition-transform ${showPast ? 'rotate-90' : ''}`}
              />
            </button>
          </div>

          {/* Inline past events — desktop only */}
          {showPast && pastItems.length > 0 && (
            <div className="mt-10 hidden grid-cols-1 gap-6 md:grid md:grid-cols-2">
              {pastItems.map((item) => (
                <EventCard
                  key={`past-${item.permalink}`}
                  title={item.title}
                  date={item.date}
                  location={item.location}
                  image={item.image}
                  type={item.type}
                  permalink={item.permalink}
                  status={item.status as 'active' | 'upcoming' | 'finished'}
                />
              ))}
            </div>
          )}
        </section>

        {/* Featured Speakers Section */}
        {allSpeakers.length > 0 && (
          <section id="speakers" className="relative z-10 overflow-hidden py-16 md:py-20">
            {/* No section tint — the speakers band sits flush on the page bg. */}
            <div className="mx-auto mb-10 max-w-[1408px] px-6 md:px-[104px]">
              <h2 className="m-0 font-onest text-[40px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[48px]">
                Featured Speakers
              </h2>
              <p className="m-0 mt-2 font-onest text-[24px] font-medium leading-[120%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[32px] md:font-normal">
                The finest minds in the industry
              </p>
            </div>

            {/* Desktop: Marquee rows | Mobile: Grid layout */}
            <div className="mb-6 hidden md:block">
              {/* Marquee row 1 — scrolls left */}
              <div className="speakers-marquee speakers-marquee--left mb-6">
                <div className="speakers-marquee__track">
                  {speakersRow1.map((s, i) => (
                    <div key={`r1-${i}`} className="speakers-marquee__item">
                      <SpeakerCard variant="dark" {...s} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Marquee row 2 — scrolls right */}
              <div className="speakers-marquee speakers-marquee--right mb-10">
                <div className="speakers-marquee__track">
                  {speakersRow2.map((s, i) => (
                    <div key={`r2-${i}`} className="speakers-marquee__item">
                      <SpeakerCard variant="dark" {...s} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Become a Speaker — DESKTOP ONLY, sits 61px below the marquee. On
                mobile its copy lives under the featured card instead. */}
            <div className="mx-auto mt-[61px] hidden max-w-[1408px] px-6 md:block md:px-[104px]">
              <a
                href="#"
                aria-label="Become a Speaker"
                className="inline-flex items-center gap-3 text-brand-green no-underline transition-colors hover:text-brand-green-dark"
              >
                <svg
                  aria-hidden
                  width="30"
                  height="28"
                  viewBox="0 0 61 56"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0"
                >
                  <path d="M 15.4 10.0 A 22 22 0 0 1 40.6 10.0 L 35.5 17.0 A 14 14 0 0 0 20.5 17.0 Z" />
                  <path d="M 46.0 15.4 A 22 22 0 0 1 46.0 40.6 L 39.0 35.5 A 14 14 0 0 0 39.0 20.5 Z" />
                  <path d="M 40.6 46.0 A 22 22 0 0 1 15.4 46.0 L 20.5 39.0 A 14 14 0 0 0 35.5 39.0 Z" />
                  <path d="M 10.0 40.6 A 22 22 0 0 1 10.0 15.4 L 17.0 20.5 A 14 14 0 0 0 17.0 35.5 Z" />
                  <circle cx="52" cy="9" r="4.2" />
                </svg>
                <span className="font-onest text-[18px] font-bold leading-[1.2] tracking-oai">
                  Become a Speaker
                </span>
              </a>
            </div>

            {/* Mobile: Vertical speaker list */}
            <div className="mb-10 grid grid-cols-1 gap-2.5 md:hidden">
              {allSpeakers.map((s) => (
                <div key={s.name}>
                  <SpeakerCard variant="dark" {...s} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sponsor Section — temporarily disabled. Uncomment to bring the Boomi
            band back (the .boomi-bg dark-mode rule in globals.css is kept for it).
            Uses background2.svg, which contains the concentric rings, "Sponsored by"
            label, boomi wordmark and "Powering the Data Economy" tagline; the square
            SVG is cropped to a 765px-tall band per Figma spec.
        <section className="relative isolate flex h-[300px] items-center justify-center md:h-[765px]">
          <img
            src={asset('/img/background2.svg')}
            alt="Sponsored by Boomi — Powering the Data Economy"
            className="boomi-bg pointer-events-none absolute left-1/2 top-1/2 block h-auto w-full min-w-[1280px] max-w-[1728px] -translate-x-1/2 -translate-y-[59.3%] select-none"
          />
          <svg aria-hidden viewBox="0 0 1728 1728" className="pointer-events-none absolute left-1/2 top-1/2 block h-auto w-full min-w-[1280px] max-w-[1728px] -translate-x-1/2 -translate-y-[59.3%] select-none">
            <circle cx="978.403" cy="1016.8" r="5.43" fill="#ff7c66" />
          </svg>
        </section>
        */}

        {/* Photos Section */}
        <section id="photos" className="relative z-10 py-16 md:py-20">
          <div className="mx-auto mb-10 max-w-[1408px] px-6 md:px-[104px]">
            <h2 className="m-0 font-onest text-[40px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[48px]">
              Photos
            </h2>
            <p className="m-0 mt-2 font-onest text-[24px] font-medium leading-[120%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[32px] md:font-normal">
              Past events and activities
            </p>
          </div>

          {/* Photo gallery — left edge tracks the centered 1360 content column
              (= heading − 80px, i.e. the column's left edge) rather than the
              viewport edge, so it doesn't over-bleed on wide screens. Still
              bleeds off the right viewport edge. */}
          <div className="flex flex-row gap-0.5 overflow-x-auto pb-4 md:gap-6 md:pl-[max(1.5rem,calc((100%_-_1360px)/2))]">
            {galleryPhotos.map((photo, i) => (
              <button
                type="button"
                key={photo.src}
                onClick={() => setLightboxIndex(i)}
                aria-label={`Open photo ${i + 1}`}
                style={{ '--tile-w': `${tileWidth(photo)}px` } as React.CSSProperties}
                className="tile-press group relative h-[260px] w-screen flex-shrink-0 cursor-pointer overflow-hidden rounded-[20px] border-none bg-brand-card-dark p-0 md:h-[384px] md:w-[var(--tile-w)] md:rounded-[40px]"
              >
                {/* Zoom the photo inside the tile instead of scaling the tile
                    itself: this row is an overflow-x scroller, so anything
                    growing past the tile's bounds is clipped vertically. */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center md:transition-transform md:duration-200 md:group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url(${asset(photo.src)})` }}
                />
              </button>
            ))}
          </div>

          {/* View gallery button */}
          <div className="mx-auto mt-10 max-w-[1408px] px-6 md:px-[104px]">
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="btn-green inline-flex h-[56px] w-full cursor-pointer items-center justify-between gap-2.5 whitespace-nowrap rounded-[20px] border-none px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[#15191c] transition-colors duration-200 md:h-[64px] md:w-[164px] md:justify-center md:text-lg"
            >
              View gallery
              <img src={asset('/img/shevron_icon.svg')} alt="" aria-hidden className="h-4 w-auto" />
            </button>
          </div>
        </section>

        {/* Footer with Subscribe + Social + Bottom bar */}
        <OaiFooter />

        {lightboxIndex !== null && (
          <PhotoLightbox
            photos={galleryPhotoSrcs}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </main>
    </>
  );
}
