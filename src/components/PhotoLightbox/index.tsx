'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { lockScroll } from '@/lib/scrollLock';
import { asset } from '@/lib/basePath';
import MaskIcon from '@/components/MaskIcon';
import { useDragScroll } from '@/lib/useDragScroll';

interface PhotoLightboxProps {
  photos: string[];
  startIndex: number;
  onClose: () => void;
}

// Same treatment as the footer's social icons: the glyph is masked with
// currentColor so it picks up the hover/pressed text colour.
const ARROW_CLASS =
  'flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-white transition-colors hover:text-brand-green active:text-brand-green-pressed';

export default function PhotoLightbox({ photos, startIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { ref: thumbsRef, dragProps: thumbsDrag } = useDragScroll();

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Vertical swipe down to dismiss (only when downward motion dominates).
    if (dy > 80 && absY > absX) {
      onClose();
      return;
    }

    // Horizontal swipe to navigate prev/next (>50px and dominant axis).
    if (absX > 50 && absX > absY) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  // The <img> box fills the whole photo area, so with object-contain the empty
  // letterbox bars beside/above the picture still belong to the element. Only
  // swallow clicks that land on the picture itself — anything in the bars is
  // backdrop and must bubble up to close the viewer.
  const onPhotoClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (!el.naturalWidth || !el.naturalHeight) return;
    const r = el.getBoundingClientRect();
    const scale = Math.min(r.width / el.naturalWidth, r.height / el.naturalHeight);
    const w = el.naturalWidth * scale;
    const h = el.naturalHeight * scale;
    const x0 = r.left + (r.width - w) / 2;
    const y0 = r.top + (r.height - h) / 2;
    const onPicture =
      e.clientX >= x0 && e.clientX <= x0 + w && e.clientY >= y0 && e.clientY <= y0 + h;
    if (onPicture) e.stopPropagation();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    const unlock = lockScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [onClose, goPrev, goNext]);

  return (
    <div
      /* iOS: 100dvh keeps the lightbox the size of the visible viewport when
         the URL bar collapses; otherwise the bottom of the photo can hide
         under the URL bar on iPhones. */
      style={{ height: '100dvh' }}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/90"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        // marginTop adds the safe-area inset on top of the top-4/md:top-6
        // offset so the button clears the notch / Dynamic Island under
        // viewport-fit=cover (inset is 0 on desktop, so md:top-6 is unaffected).
        style={{ marginTop: 'env(safe-area-inset-top)' }}
        className="btn-white absolute right-4 top-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-[#15191c] transition-colors md:right-6 md:top-6"
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Main photo area. min-h-0 lets this flex child shrink below its content
          height — without it the default min-height:auto wins and max-h-full on
          the image can't bound it. The padding is the margin around the photo.
          No stopPropagation here: the backdrop click has to reach the overlay so
          clicking the black space around the photo closes the viewer. */}
      <div className="relative flex w-full min-h-0 flex-1 items-center justify-center p-6 md:px-16 md:py-6">
        {/* Prev/next live in the thumbnail bar below, per the design. */}
        <img
          src={asset(photos[index])}
          alt={`Photo ${index + 1} of ${photos.length}`}
          onClick={onPhotoClick}
          /* h/w-full (not max-*) so the photo scales UP to the available box —
             max-* only caps and would leave small sources at natural size.
             object-contain keeps the aspect ratio, so it lands on full height
             or full width, whichever binds first. */
          className="h-full w-full rounded-[24px] object-contain md:rounded-2xl"
        />
      </div>

      {/* Bottom bar: prev arrow, thumbnail strip, next arrow */}
      {photos.length > 1 && (
        <div
          className="flex w-full items-center justify-center gap-3 px-4 pb-6 pt-2 md:gap-5 md:px-16"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={goPrev}
            className={ARROW_CLASS}
            aria-label="Previous photo"
          >
            <MaskIcon src="/img/right-arrow-icon.svg" size={14} className="rotate-180" />
          </button>

          {/* overflow-y-hidden matters: setting overflow-x alone makes the
              browser compute overflow-y: auto, and the active thumbnail's green
              marker would then scroll the strip vertically. */}
          <div
            ref={thumbsRef}
            {...thumbsDrag}
            className="no-scrollbar flex min-w-0 cursor-grab items-center gap-2 overflow-x-auto overflow-y-hidden active:cursor-grabbing md:gap-3"
          >
            {photos.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`relative h-16 w-20 flex-shrink-0 cursor-pointer rounded-lg border-none bg-cover bg-center p-0 transition-opacity md:h-20 md:w-28 ${
                  i === index
                    ? 'opacity-100 after:absolute after:bottom-1.5 after:left-1/2 after:h-[3px] after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-brand-green after:content-[""]'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundImage: `url(${asset(src)})` }}
                aria-label={`View photo ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>

          <button type="button" onClick={goNext} className={ARROW_CLASS} aria-label="Next photo">
            <MaskIcon src="/img/right-arrow-icon.svg" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
