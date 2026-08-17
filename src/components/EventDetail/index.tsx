'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SESSION_PARAM, sessionHref, sessionKey } from '@/lib/sessionKey';
import EventCard from '../EventCard';
import OaiFooter from '../OaiFooter';
import PhotoLightbox from '../PhotoLightbox';
import SpeakerBadge from '../SpeakerBadge';
import { galleryPhotos, galleryPhotoSrcs, tileWidth } from '@/lib/galleryPhotos';
import { asset } from '@/lib/basePath';
import { lockScroll } from '@/lib/scrollLock';

interface Speaker {
  name: string;
  position: string;
  photo: string;
}

interface AgendaSpeaker {
  name: string;
  position?: string;
  photo?: string;
  badges?: string[];
  tag?: string;
}

interface AgendaSession {
  title: string;
  speaker?: string;
  speakers?: AgendaSpeaker[];
  time?: string;
  date?: string;
  permalink?: string;
  slidesUrl?: string;
  videoUrl?: string;
  description?: string;
}

interface EventDetailProps {
  title: string;
  date: string;
  location: string;
  image: string;
  type: string;
  status: 'active' | 'upcoming' | 'finished';
  description?: string;
  agenda?: {
    [date: string]: {
      [category: string]: AgendaSession[];
    };
  };
  speakers?: Speaker[];
  sponsors?: { name: string; logo?: string }[];
}

// Split a time range like "9:15am–9:40am" into ["9:15am", "9:40am"], tolerating
// en-dash (–), em-dash (—) or hyphen (-) as the separator. The data uses an
// en-dash, which an earlier "[—-]" class missed — so ranges never split and
// every pill showed the full range instead of a start time.
function splitTimeRange(time?: string): [string, string] {
  const parts = (time ?? '').split(/\s*[–—-]\s*/);
  return [parts[0] ?? '', parts[1] ?? ''];
}

// Parse a clock label ("9:15am", "2:00pm") to minutes since midnight, or null.
function timeToMinutes(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(label.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

export default function EventDetail({
  title,
  date,
  location,
  image,
  type,
  status,
  description,
  agenda = {},
  speakers = [],
  sponsors = [],
}: EventDetailProps) {
  const agendaDates = Object.keys(agenda);
  const [selectedDate, setSelectedDate] = useState(agendaDates[0] || '');
  const currentAgenda = agenda[selectedDate] || {};
  const agendaCategories = Object.keys(currentAgenda);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<AgendaSession | null>(null);

  // --- Deep-linking the session modal ---------------------------------------
  // The open session is mirrored into ?session=<key>, so a session can be linked
  // to directly (search results do exactly that) and so Back closes the modal.
  //
  // This drives the URL through window.history rather than useSearchParams:
  // reading search params during render opts the page out of static rendering,
  // and this site is a static export, so the prerendered HTML must keep its
  // content. window.history.pushState/replaceState is supported by the App
  // Router for exactly this kind of same-page URL update.
  const sessionsByKey = useMemo(() => {
    const map = new Map<string, { session: AgendaSession; date: string }>();
    for (const [date, categories] of Object.entries(agenda)) {
      for (const list of Object.values(categories ?? {})) {
        for (const session of list ?? []) {
          const key = sessionKey(session);
          // First occurrence wins; keys are unique per event across all days.
          if (!map.has(key)) map.set(key, { session, date });
        }
      }
    }
    return map;
  }, [agenda]);

  // Single source of truth: whatever ?session= currently says.
  const syncFromUrl = useCallback(() => {
    const key = new URLSearchParams(window.location.search).get(SESSION_PARAM);
    const hit = key ? sessionsByKey.get(key) : undefined;
    if (!hit) {
      setSelectedSession(null);
      return;
    }
    // The session may live on a day other than the one currently tabbed.
    setSelectedDate(hit.date);
    setSelectedSession(hit.session);
  }, [sessionsByKey]);

  // Run on mount (handles arriving from search) and on Back/Forward.
  useEffect(() => {
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [syncFromUrl]);

  // Opening from the agenda adds a history entry, so Back closes the modal.
  const openSession = useCallback((session: AgendaSession) => {
    setSelectedSession(session);
    window.history.pushState(null, '', sessionHref(window.location.pathname, sessionKey(session)));
  }, []);

  // Stepping between sessions inside the modal (swipe, time pills) replaces the
  // entry instead, so paging through ten talks doesn't bury the page the user
  // came from under ten Back presses.
  const showSession = useCallback((session: AgendaSession) => {
    setSelectedSession(session);
    window.history.replaceState(
      null,
      '',
      sessionHref(window.location.pathname, sessionKey(session)),
    );
  }, []);

  const closeSession = useCallback(() => {
    setSelectedSession(null);
    // replaceState, not back(): the modal may have been opened directly from a
    // search result, in which case there is no in-page entry to return to.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Lock background scrolling while the session modal is open.
  useEffect(() => {
    if (!selectedSession) return;
    const unlock = lockScroll();
    return unlock;
  }, [selectedSession]);

  const touchStartX = useRef<number | null>(null);

  // Current-day sessions for the timeline: deduped by start time and ordered
  // chronologically, so the timeline always begins at the first session.
  const currentDaySessions = Object.values(agenda[selectedDate] || {})
    .flat()
    .filter((s) => s.time);
  const allSessions = currentDaySessions
    .filter(
      (s, i, arr) =>
        i === arr.findIndex((x) => splitTimeRange(x.time)[0] === splitTimeRange(s.time)[0]),
    )
    .sort(
      (a, b) =>
        (timeToMinutes(splitTimeRange(a.time)[0]) ?? 0) -
        (timeToMinutes(splitTimeRange(b.time)[0]) ?? 0),
    );

  // Group the ordered sessions into blocks: a gap of more than 5 minutes between
  // one session's end and the next session's start starts a new block, matching
  // the segmented Figma timeline (each block is a separate rounded pill group).
  const timeBlocks: AgendaSession[][] = [];
  let prevBlockEnd: number | null = null;
  for (const s of allSessions) {
    const [start, end] = splitTimeRange(s.time);
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end) ?? startMin;
    const gap = prevBlockEnd != null && startMin != null ? startMin - prevBlockEnd : 0;
    if (timeBlocks.length === 0 || gap > 5) timeBlocks.push([s]);
    else timeBlocks[timeBlocks.length - 1].push(s);
    prevBlockEnd = endMin ?? prevBlockEnd;
  }

  return (
    <>
    <main className="relative min-h-screen overflow-hidden bg-brand-bg">
      {/* Hero Section with Event Card */}
      <section className="relative overflow-hidden pb-1 pt-16 md:pb-1.5 md:pt-24">
        <div className="mx-auto max-w-[1408px] md:px-6">
          <div className="mb-8">
            <EventCard
              title={title}
              date={date}
              location={location}
              image={image}
              type={type}
              permalink=""
              status={status}
              featured
            />
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) — fills the 1360 column like the event card */}
      <section className="relative z-10 mx-auto mb-12 max-w-[1408px] md:px-6">
        <div className="flex h-[227px] w-full items-center justify-center rounded-[40px] bg-brand-card-dark md:h-[400px]">
          <div className="text-center">
            <span
              className="mb-4 block text-4xl"
              style={{ color: 'var(--ifm-font-color-base)', opacity: 0.2 }}
            >
              📍
            </span>
            <span
              className="font-onest text-lg font-semibold tracking-oai"
              style={{ color: 'var(--ifm-font-color-base)', opacity: 0.2 }}
            >
              Venue Map
            </span>
          </div>
        </div>
      </section>

      {/* Agenda Section */}
      {agendaCategories.length > 0 && (
        /* The top margin collapses with the map section's mb-12, so the 140px
           wins rather than stacking on top of it. */
        <section className="relative z-10 mx-auto mb-12 mt-20 max-w-[1408px] md:mt-[140px] md:px-6">
          {/* Headings and the date picker keep the 80px side inset (md:px-20);
              the session cards below fill the full column width (no inset). */}
          {/* 80px below this heading, so the track heading that follows gets its
              80px of air — unless the date picker sits between the two, in which
              case the picker carries that gap instead. */}
          <h2
            className={`m-0 px-6 font-onest text-[40px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:px-20 md:text-[80px] md:leading-[96px] ${
              agendaDates.length > 1 ? 'mb-10' : 'mb-10 md:mb-20'
            }`}
          >
            Agenda
          </h2>

          {/* Date Filter Buttons */}
          {agendaDates.length > 1 && (
            <div className="mb-10 ml-6 inline-flex items-center rounded-[20px] bg-[rgba(21,25,28,0.08)] p-0 [[data-theme=dark]_&]:bg-[#1f2326] md:mb-20 md:ml-20">
              {agendaDates.map((agendaDate) => {
                const isActive = selectedDate === agendaDate;
                return (
                  <button
                    key={agendaDate}
                    onClick={() => setSelectedDate(agendaDate)}
                    className={`flex h-[32px] cursor-pointer items-center justify-center rounded-[20px] border-none px-5 py-5 font-onest text-[12px] font-semibold tracking-[-0.48px] transition-colors ${
                      isActive
                        ? 'bg-brand-green text-[#15191c]'
                        : 'bg-transparent text-[rgba(21,25,28,0.64)] hover:text-[#15191c] [[data-theme=dark]_&]:text-white [[data-theme=dark]_&]:hover:text-white'
                    }`}
                  >
                    {agendaDate}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-12 md:space-y-20">
            {agendaCategories.map((category) => (
              <div key={category}>
                <h3 className="m-0 mb-6 px-6 font-onest text-[32px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:mb-10 md:px-20 md:text-[48px]">
                  {category}
                </h3>
                <div className="space-y-2">
                  {currentAgenda[category].map((session, i) => {
                    const sessionSpeakers: AgendaSpeaker[] =
                      session.speakers && session.speakers.length > 0
                        ? session.speakers
                        : session.speaker
                          ? [{ name: session.speaker }]
                          : [];
                    const [startTime, endTime] = splitTimeRange(session.time);

                    const sessionContent = (
                      <div className="flex flex-col gap-6">
                        {/* Title on the left, time on the right — same line,
                            vertically centred on desktop; stacked on mobile. */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
                          {/* Capped at 800px so long titles wrap instead of
                              running the full width of the card. */}
                          <h4 className="m-0 font-onest text-[24px] font-bold leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white md:max-w-[800px] md:text-[32px]">
                            {session.title}
                          </h4>
                          {session.time && (
                            <div className="flex w-[180px] flex-shrink-0 items-center gap-5 md:w-[240px]">
                              <div className="h-[10px] w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
                              <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white">
                                {startTime}
                              </span>
                              <div className="h-px flex-1 bg-[rgba(21,25,28,0.12)] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.16)]" />
                              <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white">
                                {endTime}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Speakers — one 24px green line for the whole group,
                            centred vertically (so it sits between the two photos
                            when there are two speakers). */}
                        {sessionSpeakers.length > 0 && (
                          <div className="flex items-center gap-5">
                            <div className="h-6 w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
                            <div className="flex flex-1 flex-col gap-2">
                              {sessionSpeakers.map((sp, idx) => (
                                <div key={`${sp.name}-${idx}`} className="flex items-center gap-3">
                                  {sp.photo ? (
                                    <img
                                      src={asset(sp.photo)}
                                      alt={sp.name}
                                      className="h-16 w-16 flex-shrink-0 rounded-bl-[8px] rounded-br-[32px] rounded-tl-[8px] rounded-tr-[32px] object-cover"
                                    />
                                  ) : (
                                    <div className="h-16 w-16 flex-shrink-0 rounded-bl-[8px] rounded-br-[32px] rounded-tl-[8px] rounded-tr-[32px] bg-[#d9d9d9]" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                      <span className="font-onest text-base font-bold leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white">
                                        {sp.name}
                                      </span>
                                      {(sp.badges ?? []).map((b) => (
                                        <SpeakerBadge key={b} label={b} />
                                      ))}
                                    </div>
                                    {sp.position && (
                                      <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white">
                                        {sp.position}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );

                    // Make clickable if it has a permalink (opens modal)
                    const Wrapper = 'button';
                    /* Dark mode: #15191C base + 4% white overlay = #1E2225
                       (blended solid), matching the speaker cards. Light mode
                       keeps the white tile. Every session tile opens the modal —
                       permalink is no longer required for clickability. */
                    const wrapperProps = {
                      onClick: () => openSession(session),
                      className:
                        'tile-press block w-full text-left p-6 md:p-10 rounded-[40px] bg-white hover:bg-white/90 [[data-theme=dark]_&]:bg-[#1e2225] [[data-theme=dark]_&]:hover:bg-[#1e2225]/90 transition-colors cursor-pointer relative border-none',
                    };

                    return (
                      <Wrapper key={i} {...wrapperProps}>
                        {sessionContent}
                      </Wrapper>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sponsor Section — same boomi SVG band as the events index page. */}
      {sponsors.length > 0 && (
        <section className="relative isolate flex h-[300px] items-center justify-center md:h-[765px]">
          <img
            src={asset('/img/background2.svg')}
            alt="Sponsored by Boomi — Powering the Data Economy"
            className="boomi-bg pointer-events-none absolute left-1/2 top-1/2 block h-auto w-full min-w-[1280px] max-w-[1728px] -translate-x-1/2 -translate-y-[59.3%] select-none"
          />
          {/* Orange dot overlay — not affected by dark-mode invert */}
          <svg aria-hidden viewBox="0 0 1728 1728" className="pointer-events-none absolute left-1/2 top-1/2 block h-auto w-full min-w-[1280px] max-w-[1728px] -translate-x-1/2 -translate-y-[59.3%] select-none">
            <circle cx="978.403" cy="1016.8" r="5.43" fill="#ff7c66" />
          </svg>
        </section>
      )}

      {/* Photos Section */}
      <section id="photos" className="relative z-10 py-16 md:py-20">
        <div className="mx-auto mb-10 max-w-[1408px] px-6 md:px-[104px]">
          <h2 className="m-0 font-onest text-[40px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[48px]">
            From Past Events
          </h2>
          <p className="m-0 mt-2 font-onest text-[24px] font-medium leading-[120%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[32px] md:font-normal">
            Highlights from events over the years
          </p>
        </div>

        {/* Left edge tracks the centered 1360 content column (= heading − 80px),
            instead of the viewport edge, so it doesn't over-bleed on wide screens.
            Still bleeds off the right. */}
        <div className="flex flex-row gap-0.5 overflow-x-auto pb-4 md:gap-6 md:pl-[max(1.5rem,calc((100%_-_1360px)/2))]">
          {galleryPhotos.map((photo, i) => (
            <button
              type="button"
              key={photo.src}
              onClick={() => setLightboxIndex(i)}
              aria-label={`Open photo ${i + 1}`}
              className="tile-press h-[260px] w-screen flex-shrink-0 cursor-pointer rounded-[20px] border-none bg-brand-card-dark bg-cover bg-center p-0 md:h-[384px] md:w-[var(--tile-w)] md:rounded-[40px]"
              style={
                {
                  backgroundImage: `url(${asset(photo.src)})`,
                  '--tile-w': `${tileWidth(photo)}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

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

      {/* Footer */}
      <OaiFooter />


      {/* Talk Detail Modal — matches Figma desktop "Description Layer" (568:23259) */}
      {selectedSession &&
        (() => {
          const [startTime, endTime] = splitTimeRange(selectedSession.time);
          const sessionSpeakers =
            selectedSession.speakers && selectedSession.speakers.length > 0
              ? selectedSession.speakers
              : selectedSession.speaker
                ? [{ name: selectedSession.speaker }]
                : [];

          return (
            <div
              /* iOS: use 100dvh (dynamic viewport height) so the modal fills
                 the visible area when the URL bar collapses, instead of leaving
                 a strip of page bleeding through at the bottom. inset-0 still
                 works on browsers without dvh support. */
              style={{ height: '100dvh' }}
              /* overflow-hidden on both breakpoints: only the description scrolls
                 (see the card below), never the modal as a whole. */
              className="fixed inset-0 z-50 flex flex-col items-stretch overflow-hidden bg-[color:var(--brand-bg)] px-0 py-0 md:items-center md:px-12 md:py-6"
              onClick={closeSession}
              onTouchStart={(e) => {
                touchStartX.current = e.changedTouches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const delta = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(delta) < 50) return;
                const idx = allSessions.findIndex((s) => s === selectedSession);
                if (idx === -1) return;
                if (delta > 0 && idx > 0) showSession(allSessions[idx - 1]);
                else if (delta < 0 && idx < allSessions.length - 1)
                  showSession(allSessions[idx + 1]);
              }}
            >
              {/* Mobile top bar: pills + X */}
              <div
                // Under viewport-fit=cover the sticky bar pins to the physical
                // top edge (under the Dynamic Island), so fold the safe-area
                // inset into the top padding to push the pills/close below it.
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
                className="sticky top-0 z-10 flex items-center gap-3 bg-[color:var(--brand-bg)] px-4 py-3 md:hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {allSessions.length > 0 && selectedSession.time ? (
                  <div className="flex-1 overflow-x-auto">
                    <div className="inline-flex items-center gap-2">
                      {timeBlocks.map((block, bi) => (
                        <div
                          key={`mb-${bi}`}
                          className="inline-flex items-center rounded-[20px] bg-[rgba(21,25,28,0.08)] [[data-theme=dark]_&]:bg-[#1f2326]"
                        >
                          {block.map((session) => {
                            const sessionTime = splitTimeRange(session.time)[0];
                            const isActive =
                              sessionTime === splitTimeRange(selectedSession.time)[0];
                            return (
                              <button
                                key={`m-${session.time}-${session.title}`}
                                onClick={() => showSession(session)}
                                className={`flex h-9 flex-shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[20px] border-none px-4 font-onest text-sm font-semibold tracking-oai transition-colors ${
                                  isActive
                                    ? 'bg-brand-green text-[#15191c]'
                                    : 'bg-transparent text-[rgba(21,25,28,0.64)] [[data-theme=dark]_&]:text-white'
                                }`}
                              >
                                {sessionTime}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  onClick={closeSession}
                  aria-label="Close"
                  className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(21,25,28,0.08)] text-[#15191c] transition-colors hover:bg-black/10 [[data-theme=dark]_&]:bg-[#1f2326] [[data-theme=dark]_&]:text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Desktop close button */}
              <button
                onClick={closeSession}
                className="absolute right-6 top-6 z-10 hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-[#15191c] text-white transition-colors hover:bg-[#15191c]/80 [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-[#15191c] [[data-theme=dark]_&]:hover:bg-white/80 md:flex"
                aria-label="Close"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* min-h-0 must apply at every breakpoint: a flex child defaults to
                  min-height:auto and would refuse to shrink below its content,
                  pushing the card past the modal instead of letting the
                  description scroll (that was the mobile-only overflow). */}
              <div className="my-0 flex min-h-0 w-full max-w-[1360px] flex-1 flex-col items-stretch gap-3 md:my-0 md:mt-20 md:items-center">
                {/* Content card — white in light mode; in dark mode #15191C + 4%
                    white = #1E2225, matching the agenda tiles and speaker cards. */}
                <div
                  /* A fixed-size panel on both breakpoints that clips its own
                     content: flex-1 + min-h-0 makes it take exactly the space
                     left by the top bar and the buttons/timeline, so session
                     length never changes the modal's shape. The only scroller
                     inside is the description block. */
                  className="flex w-full min-h-0 flex-1 flex-col overflow-hidden rounded-[40px] bg-white px-6 pt-6 pb-8 [[data-theme=dark]_&]:bg-[#1e2225] md:max-h-[1000px] md:px-20 md:py-12"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto flex min-h-0 w-full max-w-[800px] flex-1 flex-col gap-6">
                    {/* Top group: time row + title. Mobile: the time row sits 24px
                        below the card's top edge (card pt-6) and 24px above the
                        title (gap-6), with no internal vertical padding on the row
                        so the 24px is measured to the visible times themselves. */}
                    <div className="flex flex-shrink-0 flex-col gap-6 md:gap-12">
                      {selectedSession.time && (
                        <div className="flex max-w-[240px] items-center gap-6 py-0 md:py-2">
                          <div className="h-[10px] w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
                          <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white md:text-lg">
                            {startTime}
                          </span>
                          <div className="h-px flex-1 bg-[rgba(21,25,28,0.12)] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.16)]" />
                          <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white md:text-lg">
                            {endTime}
                          </span>
                        </div>
                      )}

                      <h2 className="m-0 font-onest text-[32px] font-bold leading-[1.1] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white md:text-[48px] md:tracking-[-1.92px]">
                        {selectedSession.title}
                      </h2>
                    </div>

                    {/* Description — the talk's real abstract, falling back to a
                        generic line only when the session has none. This is the
                        modal's only scroll region: flex-1 + min-h-0 lets it take
                        the leftover height and scroll on overflow, so the time,
                        title, speakers and buttons stay put. */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <p className="m-0 whitespace-pre-line font-onest text-base font-normal leading-[1.4] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white md:text-lg">
                        {selectedSession.description ?? `Join us for this session at ${title}.`}
                      </p>
                    </div>

                    {/* Speakers section */}
                    {sessionSpeakers.length > 0 && (
                      <div className="flex-shrink-0 pt-8 md:pt-12">
                        <div className="flex items-center gap-[27px]">
                          <div className="h-6 w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
                          <div className="flex flex-1 flex-col gap-4">
                            {sessionSpeakers.map((sp, idx) => (
                              <div
                                key={`${sp.name}-${idx}`}
                                className="flex items-center gap-6"
                              >
                                <div className="flex flex-1 items-center gap-3">
                                  {sp.photo ? (
                                    <img
                                      src={asset(sp.photo)}
                                      alt={sp.name}
                                      className="h-16 w-16 flex-shrink-0 rounded-bl-[8px] rounded-br-[32px] rounded-tl-[8px] rounded-tr-[32px] object-cover"
                                    />
                                  ) : (
                                    <div className="h-16 w-16 flex-shrink-0 rounded-bl-[8px] rounded-br-[32px] rounded-tl-[8px] rounded-tr-[32px] bg-[#d9d9d9]" />
                                  )}
                                  <div className="flex min-w-0 flex-col gap-1">
                                    <span className="font-onest text-base font-bold leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white">
                                      {sp.name}
                                    </span>
                                    {sp.position && (
                                      <span className="font-onest text-base font-normal leading-[1.2] tracking-oai text-[#15191c] [[data-theme=dark]_&]:text-white">
                                        {sp.position}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <a
                                  href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(sp.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center text-[#15191c] [[data-theme=dark]_&]:text-white transition-colors hover:text-brand-green"
                                  aria-label={`LinkedIn — ${sp.name}`}
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

                    {/* Slides / recording buttons — inside card on desktop */}
                    <div className="hidden flex-shrink-0 items-center gap-3 pt-3 md:flex">
                      {selectedSession.slidesUrl ? (
                        <a
                          href={selectedSession.slidesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-green inline-flex h-[64px] w-auto cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none px-6 py-1.5 font-onest text-lg font-bold tracking-oai text-[#15191c] no-underline transition-colors duration-200"
                        >
                          View slides
                        </a>
                      ) : (
                        !selectedSession.videoUrl && (
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            title="Slides not available"
                            className="inline-flex h-[64px] w-auto cursor-not-allowed items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none bg-[rgba(21,25,28,0.12)] px-6 py-1.5 font-onest text-lg font-bold tracking-oai text-[rgba(21,25,28,0.4)] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.08)] [[data-theme=dark]_&]:text-[rgba(255,255,255,0.4)]"
                          >
                            View slides
                          </button>
                        )
                      )}
                      {selectedSession.videoUrl && (
                        <a
                          href={selectedSession.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-[64px] w-auto cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-2 border-[#15191c] bg-transparent px-6 py-1.5 font-onest text-lg font-bold tracking-oai text-[#15191c] no-underline transition-colors duration-200 [[data-theme=dark]_&]:border-white [[data-theme=dark]_&]:text-white"
                        >
                          Watch recording
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slides / recording buttons — outside the card, at the bottom
                    of the modal (mobile only) */}
                <div
                  className="mt-auto flex w-full flex-col gap-3 px-4 pb-12 md:hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedSession.slidesUrl ? (
                    <a
                      href={selectedSession.slidesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-green inline-flex h-[56px] w-full cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[#15191c] no-underline transition-colors duration-200"
                    >
                      View slides
                    </a>
                  ) : (
                    !selectedSession.videoUrl && (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="inline-flex h-[56px] w-full cursor-not-allowed items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none bg-[rgba(21,25,28,0.12)] px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[rgba(21,25,28,0.4)] [[data-theme=dark]_&]:bg-[rgba(255,255,255,0.08)] [[data-theme=dark]_&]:text-[rgba(255,255,255,0.4)]"
                      >
                        View slides
                      </button>
                    )
                  )}
                  {selectedSession.videoUrl && (
                    <a
                      href={selectedSession.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-[56px] w-full cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-2 border-[#15191c] bg-transparent px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[#15191c] no-underline transition-colors duration-200 [[data-theme=dark]_&]:border-white [[data-theme=dark]_&]:text-white"
                    >
                      Watch recording
                    </a>
                  )}
                </div>

                {/* Timeline pills below the card — desktop only */}
                {allSessions.length > 0 && selectedSession.time && (
                  <div
                    /* mt-auto pins the timeline to the bottom of the modal, so
                       it stays put while the card scrolls. */
                    className="hidden w-full items-center overflow-x-auto pt-3 md:mt-auto md:flex"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* mx-auto (not justify-center on the scroll parent) so the
                        track centers when it fits but collapses to left-aligned
                        when it overflows — otherwise justify-center clips the
                        first block's rounded corner into a hard edge. */}
                    <div className="mx-auto inline-flex items-center gap-2">
                      {timeBlocks.map((block, bi) => (
                        <div
                          key={`db-${bi}`}
                          className="inline-flex items-center rounded-[20px] bg-[rgba(21,25,28,0.08)] [[data-theme=dark]_&]:bg-[#1f2326]"
                        >
                          {block.map((session) => {
                            const sessionTime = splitTimeRange(session.time)[0];
                            const isActive =
                              sessionTime === splitTimeRange(selectedSession.time)[0];
                            return (
                              <button
                                key={`${session.time}-${session.title}`}
                                onClick={() => showSession(session)}
                                className={`flex h-10 flex-shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[20px] border-none px-5 py-2 font-onest text-base font-semibold tracking-oai transition-colors ${
                                  isActive
                                    ? 'bg-brand-green text-[#15191c]'
                                    : 'bg-transparent text-[rgba(21,25,28,0.64)] hover:text-[#15191c] [[data-theme=dark]_&]:text-white'
                                }`}
                              >
                                {sessionTime}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </main>

    {lightboxIndex !== null && (
      <PhotoLightbox
        photos={galleryPhotoSrcs}
        startIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    )}
    </>
  );
}
