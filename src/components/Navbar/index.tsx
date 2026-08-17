'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { asset } from '@/lib/basePath';
import SearchModal from '@/components/SearchModal';
import MaskIcon from '@/components/MaskIcon';
import type { SearchItem } from '@/lib/searchIndex';

export default function Navbar({ searchItems = [] }: { searchItems?: SearchItem[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    // The page scrolls inside #scroll-root, not the window (see app/layout.tsx).
    const scroller = document.getElementById('scroll-root');
    const target: HTMLElement | Window = scroller ?? window;
    const onScroll = () =>
      setScrolled((scroller ? scroller.scrollTop : window.scrollY) > 8);
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    // Reset the scroll container to the top on navigation (the window no longer
    // scrolls, so Next.js's default scroll-to-top doesn't apply here).
    const scroller = document.getElementById('scroll-root');
    if (scroller) scroller.scrollTop = 0;
  }, [pathname]);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = `Check out this OpenAPI event: ${url}`;
    // Native Web Share API (iOS Safari, Android Chrome, modern desktop browsers
    // with sharing integrations). Falls back to clipboard if unsupported or if
    // the user dismisses the sheet.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: document.title, text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // last-resort fallback for very old browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2000);
  };

  return (
    <>
      {/* iOS: switched from `position: sticky` → `fixed` because sticky is
          unreliable on iOS Safari when the URL bar collapses/expands.
          env(safe-area-inset-top) keeps the bar below the notch / Dynamic Island. */}
      <nav
        data-navbar
        data-scrolled={scrolled ? 'true' : 'false'}
        style={{
          // Height includes the safe-area inset so the bar's border-box grows to
          // clear the notch / Dynamic Island. paddingTop reserves that inset at
          // the top, leaving exactly the bar height for the logo — so the
          // padding never overflows a clamped height (the iOS 26 bug).
          // The heights come from globals.css so #scroll-root can reserve the
          // matching offset from the same source; --navbar-h is taller on
          // desktop, where the resting logo is full-size.
          paddingTop: 'env(safe-area-inset-top)',
          height: `calc(${scrolled ? 'var(--navbar-h-scrolled)' : 'var(--navbar-h)'} + env(safe-area-inset-top))`,
        }}
        className={`fixed inset-x-0 top-0 z-30 flex items-center justify-center px-6 md:px-10 transition-[height,background-color,box-shadow] duration-200 ease-out ${
          scrolled
            ? 'bg-[color:var(--brand-bg)] shadow-[0_1px_0_var(--brand-separator)]'
            : 'bg-transparent shadow-none'
        }`}
      >
        {/* Full-width bar: 24px side padding on mobile, 40px on desktop (px-6 → md:px-10). */}
        <div className="flex h-full w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-none bg-transparent text-[color:var(--ifm-font-color-base)] no-underline transition hover:text-brand-green active:text-brand-green-pressed"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12H4" />
                <path d="M10 6l-6 6 6 6" />
              </svg>
            </Link>
          )}
          <Link href="/" data-navbar-logo className="flex items-center no-underline">
            <img
              src={asset('/img/openlogo.svg')}
              alt="OpenAPI Initiative"
              /* Mobile: fixed 121px width (height follows the 228×68 ratio ≈ 36px).
                 Desktop rests at the design's full 227×68. The 227 is the
                 design's box; the SVG is 228×68, so pinning the width shaves a
                 sub-pixel rather than distorting anything visibly. Scrolled
                 drops to 40px tall and goes back to w-auto so the width tracks
                 the animating height rather than snapping to a second fixed
                 number. */
              className={`navbar-logo-img h-auto w-[121px] transition-[height] duration-200 ease-out ${
                scrolled ? 'md:h-10 md:w-auto' : 'md:h-[68px] md:w-[227px]'
              }`}
            />
          </Link>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-8 md:flex">
          <ShareButton onClick={handleShare} />
          <SearchButton onClick={() => setSearchOpen(true)} />
          <ThemeToggle scrolled={scrolled} />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[color:var(--ifm-font-color-base)] transition hover:text-brand-green active:text-brand-green-pressed md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
        </div>
      </nav>

      {/* The navbar offset is reserved by #scroll-root's padding-top
          (see globals.css), so no in-flow spacer is needed here. */}
      {menuOpen && (
        <div
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(4rem + env(safe-area-inset-top))',
          }}
          className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-white px-6 [[data-theme=dark]_&]:bg-[#15191c] md:hidden"
        >
          <div className="flex items-center gap-6 text-[#15191c] [[data-theme=dark]_&]:text-white">
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-current transition hover:text-brand-green active:text-brand-green-pressed"
            >
              <MaskIcon src="/img/search_icon.svg" size={22} />
            </button>
            <button
              type="button"
              aria-label="Share this page"
              onClick={() => {
                setMenuOpen(false);
                handleShare();
              }}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-current transition hover:text-brand-green active:text-brand-green-pressed"
            >
              <MaskIcon src="/img/share_icon.svg" size={22} />
            </button>
            <MobileMenuThemeToggle />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[#15191c] transition hover:text-brand-green active:text-brand-green-pressed [[data-theme=dark]_&]:text-white"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <SearchModal items={searchItems} open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* "Link copied!" toast — fades out after 2s.
         pointer-events-none so it never blocks clicks under it. */}
      <div
        aria-live="polite"
        role="status"
        // Lift above the home indicator under viewport-fit=cover (inset is 0 on
        // devices without one, so bottom-6 is unchanged there).
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        className={`pointer-events-none fixed bottom-6 left-1/2 z-[1100] -translate-x-1/2 rounded-full bg-[#15191c] px-5 py-3 font-onest text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-opacity duration-300 [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-[#15191c] ${
          toastVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Link copied!
      </div>
    </>
  );
}

// Theme-toggle icon states come from the __design/theme_change set: a Day
// (light) and Night (dark) variant, each with Normal / Hovered / Clicked. All
// six image URLs are exposed as CSS vars (asset() keeps the basePath prefix);
// globals.css picks day vs night off [data-theme] and swaps state on
// :hover / :active — so the choice tracks the same attribute as the rest of
// the app's theming rather than a hydration-timed resolvedTheme.
function themeToggleStyleVars(): React.CSSProperties {
  const u = (name: string) => `url('${asset(`/img/theme/${name}.svg`)}')`;
  return {
    '--th-day-normal': u('day-normal'),
    '--th-day-hover': u('day-hovered'),
    '--th-day-active': u('day-clicked'),
    '--th-night-normal': u('night-normal'),
    '--th-night-hover': u('night-hovered'),
    '--th-night-active': u('night-clicked'),
  } as React.CSSProperties;
}

function MobileMenuThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <button
      type="button"
      aria-label="Toggle color mode"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="navbar-theme-toggle"
      style={{
        ...themeToggleStyleVars(),
        border: 'none',
        cursor: 'pointer',
        width: 32,
        height: 32,
        padding: 0,
        color: 'transparent',
      }}
    />
  );
}

function ShareButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share this page"
      className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[color:var(--ifm-font-color-base)] transition hover:text-brand-green active:text-brand-green-pressed ${className}`}
    >
      <MaskIcon src="/img/share_icon.svg" size={22} />
    </button>
  );
}

function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[color:var(--ifm-font-color-base)] transition hover:text-brand-green active:text-brand-green-pressed"
    >
      <MaskIcon src="/img/search_icon.svg" size={22} />
    </button>
  );
}

function ThemeToggle({ scrolled }: { scrolled: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const size = scrolled ? 32 : 40;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color mode"
      className="navbar-theme-toggle"
      style={{
        ...themeToggleStyleVars(),
        border: 'none',
        cursor: 'pointer',
        width: size,
        height: size,
        padding: 0,
        margin: '0 4px',
        color: 'transparent',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.2s ease, width 0.2s ease, height 0.2s ease',
      }}
    />
  );
}
