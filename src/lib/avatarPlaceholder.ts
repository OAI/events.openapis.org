// The neutral avatar shown for a speaker with no photo yet.
//
// It lives here, apart from lib/speakers.ts, because the components that render a
// portrait are client components and need to recognise the placeholder — while
// lib/speakers.ts bundles every speakers.yaml at module scope, so importing it
// from the browser would pull the whole registry into the page bundle.
//
// There are two files, one per theme, differing only in ink colour (near-black at
// 4%/8% vs white at the same). Only the light one is named here: it doubles as
// the sentinel value, so `photo === AVATAR_PLACEHOLDER` is how a portrait knows it
// is showing a placeholder rather than a person. The actual light/dark swap is
// CSS — see `.avatar-placeholder` in app/globals.css — because next-themes runs
// with enableSystem={false}, so the theme is a deliberate toggle and a
// prefers-color-scheme rule inside the SVG would ignore it.
export const AVATAR_PLACEHOLDER = '/img/placeholder_light.svg';

/**
 * Whether a speaker has a real photo rather than the placeholder.
 *
 * `photo` is optional on the agenda/talk speaker shapes, where it may simply be
 * absent — which is the same answer as the placeholder, so both are handled here
 * instead of at every call site.
 */
export function hasPhoto(speaker: { photo?: string }): boolean {
  return !!speaker.photo && speaker.photo !== AVATAR_PLACEHOLDER;
}

/**
 * The URL to render for a portrait that is known to have a photo. Returns the
 * placeholder for an absent one, so callers get a definite string without a
 * non-null assertion — `hasPhoto` is a boolean rather than a type predicate,
 * because a predicate narrows the *else* branch to `never` wherever `photo` is
 * already a required string.
 */
export function photoSrc(photo: string | undefined): string {
  return photo || AVATAR_PLACEHOLDER;
}

/**
 * Class + inline style for one portrait, so all six call sites agree on how a
 * missing photo looks. Placeholder portraits deliberately carry NO inline
 * background-image: the class owns it, and an inline value would win over the
 * `[data-theme='dark']` rule that swaps in the dark file.
 */
export function portraitStyle(photo: string | undefined, assetUrl: (p: string) => string) {
  return hasPhoto({ photo })
    ? { className: '', style: { backgroundImage: `url(${assetUrl(photo as string)})` } }
    : { className: 'avatar-placeholder', style: {} };
}
