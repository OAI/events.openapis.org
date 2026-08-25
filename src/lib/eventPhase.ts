// Where an event sits relative to *now*.
//
// The authored `status:` in event.yaml is a build-time snapshot, and this site is
// a static export that only rebuilds on push to main — so an event that starts or
// ends after the last deploy would otherwise stay frozen in the wrong state until
// someone commits. Everything here is therefore evaluated against a clock the
// caller supplies (see lib/useNow.ts), which is the visitor's, not the builder's.

export type EventPhase = 'upcoming' | 'ongoing' | 'finished';

// The fields any phase decision needs — a structural subset of both EventItem and
// the flattened card props the list components pass around.
export interface PhaseInput {
  status?: string;
  startDate?: string;
  endDate?: string;
}

// The authored status, narrowed to the two states YAML can express meaningfully.
// 'active' is a display hint (featured card), not a lifecycle stage.
function authoredPhase(e: PhaseInput): EventPhase {
  return e.status === 'finished' ? 'finished' : 'upcoming';
}

/**
 * `now` is a millisecond timestamp, or **0 meaning "no clock yet"** — the value
 * useNow() returns during SSR and on the first client render. In that case the
 * authored status is returned unchanged, so server HTML and first-paint markup
 * agree and hydration stays clean; the live phase settles one tick later.
 */
export function eventPhase(e: PhaseInput, now: number): EventPhase {
  const authored = authoredPhase(e);
  if (!now || !e.startDate || !e.endDate) return authored;
  // An explicit `status: finished` always wins. Dates alone would resurrect a
  // cancelled or retired event whose listed dates happen to be in the future.
  if (authored === 'finished') return 'finished';

  const start = new Date(e.startDate).getTime();
  const end = new Date(e.endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return authored;

  if (now < start) return 'upcoming';
  return now <= end ? 'ongoing' : 'finished';
}

/**
 * Re-partition the two build-time lists against the current clock.
 *
 * `scheduled` is the build-time upcoming/active set in soonest-first order (the
 * data/events.order.yml pin, then the date sort in lib/events.ts); `finished` is
 * the build-time past set, most-recent-first. Events that have since ended move
 * to the front of `past`.
 *
 * Nothing else is re-sorted: the incoming orders are already correct, and
 * re-sorting would make cards visibly jump when the live clock arrives. The
 * moved slice IS reversed, because soonest-first inverts to most-recent-first.
 */
export function splitByPhase<T extends PhaseInput>(
  scheduled: T[],
  finished: T[],
  now: number,
): { upcoming: T[]; past: T[] } {
  const stillScheduled: T[] = [];
  const justFinished: T[] = [];
  for (const item of scheduled) {
    (eventPhase(item, now) === 'finished' ? justFinished : stillScheduled).push(item);
  }
  return { upcoming: stillScheduled, past: [...justFinished.reverse(), ...finished] };
}
