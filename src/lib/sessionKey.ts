// A stable, URL-safe identifier for a single agenda session, used to deep-link
// the session modal on an event page: /events/<event>/?session=<key>.
//
// Sessions that reference a full talk reuse that talk's slug, so the key is the
// same string the old /events/talks/<slug> URL used. Everything else falls back
// to a slugified title.
//
// Why not a time-derived key: of the 168 sessions in data/, 70 have no
// permalink and 29 of those have no `time` either, so time cannot address them
// all. Title slugs can — they are unique per event across all days for every
// session currently in data/.

export const SESSION_PARAM = 'session';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 80);
}

/** `/events/talks/foo` -> `foo`. */
export function talkSlugFromPermalink(permalink?: string): string | undefined {
  if (!permalink) return undefined;
  return permalink.split('/').filter(Boolean).pop();
}

export function sessionKey(session: { title: string; permalink?: string }): string {
  return talkSlugFromPermalink(session.permalink) ?? slugify(session.title);
}

/**
 * Build the deep link for a session. `eventPermalink` comes from the event data
 * (`/events/<slug>`, no trailing slash); the site runs with `trailingSlash: true`,
 * so add one before the query to avoid a redirect hop.
 */
export function sessionHref(eventPermalink: string, key: string): string {
  const base = eventPermalink.endsWith('/') ? eventPermalink : `${eventPermalink}/`;
  return `${base}?${SESSION_PARAM}=${encodeURIComponent(key)}`;
}
