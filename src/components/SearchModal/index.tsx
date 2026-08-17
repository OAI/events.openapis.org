'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { asset } from '@/lib/basePath';
import type { SearchItem, SearchSpeaker } from '@/lib/searchIndex';
import { lockScroll } from '@/lib/scrollLock';
import SpeakerBadge from '@/components/SpeakerBadge';

interface SearchModalProps {
  items: SearchItem[];
  open: boolean;
  onClose: () => void;
}

/** Results appear in this order, so the page's own content leads. */
const TYPE_ORDER: SearchItem['type'][] = ['event', 'speaker', 'talk', 'page'];
/** Per-type caps, so one prolific type can't crowd the others out. */
const TYPE_LIMIT: Record<SearchItem['type'], number> = {
  event: 6,
  speaker: 6,
  talk: 8,
  page: 3,
};

/**
 * Renders `text` with every occurrence of the query in brand green. Matching is
 * case-insensitive but the original casing is preserved, so searching "api"
 * still highlights the "API" inside "OpenAPI".
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts: ReactNode[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at === -1) break;
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="bg-transparent p-0 text-brand-green">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
  }
  if (from === 0) return <>{text}</>;
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

/** The same tag glyph the event cards use for their type badge. */
function TypeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      className="mt-px flex-shrink-0"
    >
      <path d="M20.59 13.41 11 3.82A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Speaker portrait, in the asymmetric pill the agenda and speaker cards use. */
function Portrait({ photo, size }: { photo: string; size: number }) {
  return (
    <div
      className="flex-shrink-0 bg-[#D9D9D9] bg-cover bg-center"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${asset(photo)})`,
        borderRadius: `${size / 8}px ${size / 2}px ${size / 2}px ${size / 8}px`,
      }}
    />
  );
}

function TalkSpeakerChip({ speaker }: { speaker: SearchSpeaker }) {
  return (
    <div className="flex flex-row items-center gap-2">
      <Portrait photo={speaker.photo} size={32} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-onest text-xs font-bold leading-[130%] tracking-oai">
          {speaker.name}
        </span>
        <span className="truncate font-onest text-xs font-normal leading-[130%] tracking-oai text-[color:var(--brand-muted)]">
          {speaker.position}
        </span>
      </div>
    </div>
  );
}

export default function SearchModal({ items, open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // select() rather than focus(): reopening keeps the previous query visible
    // (handy for refining a search), but typing replaces it straight away.
    const t = setTimeout(() => inputRef.current?.select(), 0);
    const unlock = lockScroll();
    return () => {
      clearTimeout(t);
      unlock();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as SearchItem[];
    const hits = items
      .map((item, i) => {
        if (!item.keywords.includes(q)) return null;
        // Title matches rank above matches that only came from the wider
        // keywords (a talk abstract, a speaker's other events), and an earlier
        // match in the title ranks above a later one.
        const inTitle = item.title.toLowerCase().indexOf(q);
        return { item, rank: inTitle === -1 ? [1, 0, i] : [0, inTitle, i] };
      })
      .filter((h): h is { item: SearchItem; rank: number[] } => h !== null)
      .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.rank[2] - b.rank[2]);

    return TYPE_ORDER.flatMap((type) =>
      hits
        .filter((h) => h.item.type === type)
        .slice(0, TYPE_LIMIT[type])
        .map((h) => h.item),
    );
  }, [query, items]);

  if (!open) return null;

  const rowClass =
    'flex w-full flex-col items-start gap-1 rounded-[24px] px-6 py-5 text-[color:var(--ifm-font-color-base)] no-underline transition-colors hover:bg-black/[0.04] hover:text-[color:var(--ifm-font-color-base)] [[data-theme=dark]_&]:hover:bg-white/[0.06]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      /* Full-screen rather than a card on a dimmed backdrop: the results are
         rich rows (covers, portraits, abstracts) that need the room, and on
         mobile a sheet-sized dialog left almost none. Opaque --brand-bg, so the
         page behind never shows through and reads as clutter. */
      className="fixed inset-0 z-[60] flex flex-col bg-[color:var(--brand-bg)]"
    >
      <div className="relative flex flex-shrink-0 items-center justify-center px-20 pb-4 pt-6 md:px-24 md:pb-6">
        <div className="flex max-w-full items-center gap-3">
          {/* Auto-sizing centred input, so the clear button sits right next to
              the text however long the query is. An invisible mirror span holds
              the same string and sizes the label; the input is laid over it
              absolutely, which is what keeps the input's own intrinsic width
              (a good 27px wider than the text, even at size={1}) out of the
              measurement. Both carry the same font and px-1, so they match. */}
          <label className="relative block max-w-full overflow-hidden">
            <span
              aria-hidden
              className="pointer-events-none invisible block whitespace-pre px-1 font-onest text-xl font-bold tracking-oai md:text-2xl"
            >
              {query || 'Search events, talks, speakers…'}
            </span>
            <input
              ref={inputRef}
              type="text"
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, talks, speakers…"
              aria-label="Search events, talks, speakers"
              className="absolute inset-0 w-full min-w-0 border-none bg-transparent px-1 text-center font-onest text-xl font-bold tracking-oai text-[color:var(--ifm-font-color-base)] outline-none placeholder:font-normal placeholder:text-[color:var(--brand-muted)] md:text-2xl"
            />
          </label>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-[color:var(--brand-muted)] transition-colors hover:text-[color:var(--ifm-font-color-base)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          /* Inverted against the page, the way the design shows it: a dark disc
             on the light theme, a light one on the dark theme. The hover shades
             are the same blends the .btn-black / .btn-white fills use. */
          className="absolute right-6 top-6 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-[#15191C] text-white transition-colors hover:bg-[#313537] md:right-10 [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-[#15191C] [[data-theme=dark]_&]:hover:bg-[#E3E3E4]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-16 md:px-6">
        <div className="mx-auto flex w-full max-w-[720px] flex-col">
          {query.trim() === '' ? (
            <p className="px-6 py-8 text-center font-onest text-base font-normal tracking-oai text-[color:var(--brand-muted)]">
              Start typing to search across events, talks, speakers, and pages.
            </p>
          ) : results.length === 0 ? (
            <p className="px-6 py-8 text-center font-onest text-base font-normal tracking-oai text-[color:var(--brand-muted)]">
              No results for &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            results.map((r) => (
              <Link key={`${r.type}-${r.permalink}-${r.title}`} href={r.permalink} onClick={onClose} className={rowClass}>
                {r.type === 'event' && (
                  <>
                    <span className="flex flex-row items-center gap-2 font-onest text-sm font-semibold leading-[120%] tracking-oai">
                      <TypeIcon />
                      {r.eventType}
                    </span>
                    <span className="font-onest text-xl font-bold leading-[120%] tracking-oai md:text-2xl">
                      <Highlight text={r.title} query={query} />
                    </span>
                    <span className="mt-1 font-onest text-sm font-bold leading-[130%] tracking-oai">
                      {r.date}
                    </span>
                    <span className="font-onest text-sm font-normal leading-[130%] tracking-oai text-[color:var(--brand-muted)]">
                      {r.location}
                    </span>
                  </>
                )}

                {r.type === 'speaker' && (
                  <span className="flex w-full flex-row items-center gap-4">
                    {r.photo && <Portrait photo={r.photo} size={64} />}
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-row items-center gap-2 font-onest text-xl font-bold leading-[120%] tracking-oai">
                        {/* The name is one flex item. Highlight() returns a
                            fragment, so without this wrapper every <mark> and
                            every run between them would be its own item and the
                            gap-2 meant for the badges would break the name into
                            spaced-out pieces. */}
                        <span className="min-w-0">
                          <Highlight text={r.title} query={query} />
                        </span>
                        {(r.badges ?? []).map((b) => (
                          <SpeakerBadge key={b} label={b} />
                        ))}
                      </span>
                      <span className="font-onest text-sm font-normal leading-[130%] tracking-oai text-[color:var(--brand-muted)]">
                        <Highlight text={r.position ?? ''} query={query} />
                      </span>
                    </span>
                  </span>
                )}

                {r.type === 'talk' && (
                  <>
                    {/* Which event this talk belongs to, above the title the way
                        the event rows carry their type. A recurring talk appears
                        once per event it was given at, so without this line the
                        repeats are indistinguishable. */}
                    <span className="font-onest text-sm font-semibold leading-[120%] tracking-oai text-[color:var(--brand-muted)]">
                      {r.eventTitle}
                      {r.time ? ` · ${r.time}` : ''}
                    </span>
                    <span className="font-onest text-lg font-bold leading-[120%] tracking-oai">
                      <Highlight text={r.title} query={query} />
                    </span>
                    {(r.speakers ?? []).length > 0 && (
                      <span className="mt-2 flex flex-row items-center gap-4">
                        {/* The green tick the agenda uses to mark a session's speakers. */}
                        <span className="h-6 w-[5px] flex-shrink-0 rounded-[10px] bg-brand-green" />
                        <span className="flex min-w-0 flex-col gap-2 md:flex-row md:gap-6">
                          {(r.speakers ?? []).map((s) => (
                            <TalkSpeakerChip key={s.name} speaker={s} />
                          ))}
                        </span>
                      </span>
                    )}
                  </>
                )}

                {r.type === 'page' && (
                  <>
                    <span className="font-onest text-xl font-bold leading-[120%] tracking-oai">
                      <Highlight text={r.title} query={query} />
                    </span>
                    {r.description && (
                      <span className="font-onest text-sm font-normal leading-[130%] tracking-oai text-[color:var(--brand-muted)]">
                        {r.description}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
