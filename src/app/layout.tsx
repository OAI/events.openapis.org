import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';
import { asset } from '@/lib/basePath';
import { buildSearchIndex } from '@/lib/searchIndex';
import './globals.css';

const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-onest',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://events.openapis.org';
const OG_IMAGE = asset('/img/docusaurus-social-card.jpg');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'OpenAPI Events',
    template: '%s | OpenAPI Events',
  },
  description: 'OpenAPI events and conferences',
  icons: { icon: asset('/img/favicon.ico') },
  openGraph: {
    title: 'OpenAPI Events',
    description: 'OpenAPI events and conferences',
    siteName: 'OpenAPI Initiative',
    type: 'website',
    url: '/',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'OpenAPI Events' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAPI Events',
    description: 'OpenAPI events and conferences',
    images: [OG_IMAGE],
  },
};

// viewport-fit=cover makes env(safe-area-inset-*) report real values on
// notch / Dynamic Island devices (iPhone 17 Pro Max, iOS 26). Without it the
// insets behave inconsistently across iOS versions, which broke the fixed
// navbar layout. The navbar and other top/bottom-anchored overlays account
// for the insets explicitly.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const searchItems = buildSearchIndex();
  return (
    <html
      lang="en"
      className={onest.variable}
      style={
        {
          ['--bg1-url']: `url('${asset('/img/bg_top.png')}')`,
          ['--avatar-ph-light']: `url('${asset('/img/placeholder_light.svg')}')`,
          ['--avatar-ph-dark']: `url('${asset('/img/placeholder_dark.svg')}')`,
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <Navbar searchItems={searchItems} />
          {/* Page scrolls inside this container, not the document body, so the
              fixed navbar stays pinned in iOS in-app browsers (see globals.css
              and lib/scrollLock.ts). #page is the scrolled content itself, and
              carries the top-of-page arcs decoration so it scrolls away — see
              globals.css for why that can't live on #scroll-root or <body>. */}
          <div id="scroll-root">
            <div id="page">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
