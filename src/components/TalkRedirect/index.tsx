'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Sends /events/talks/<slug> to the same session opened on its event page.
 *
 * The standalone talk page rendered the talk with no event around it, so it read
 * as "a modal without an event". The event page is now the canonical home for a
 * session; these URLs stay alive as redirects so existing links keep working.
 *
 * The site is a static export, so there is no server redirect to use — this runs
 * on mount instead. The page still renders the talk underneath, which means no
 * blank flash for users and real content for crawlers and no-JS visitors.
 */
export default function TalkRedirect({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return null;
}
