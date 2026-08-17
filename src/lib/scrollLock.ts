// The app scrolls inside #scroll-root (see app/layout.tsx) rather than the
// document body, so the fixed navbar stays pinned in iOS in-app browsers.
// Modals call this to lock background scrolling while they are open. Falls back
// to the body if the scroll root isn't present (e.g. during SSR-less tests).
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  const el = document.getElementById('scroll-root') ?? document.body;
  const previous = el.style.overflow;
  el.style.overflow = 'hidden';
  return () => {
    el.style.overflow = previous;
  };
}
