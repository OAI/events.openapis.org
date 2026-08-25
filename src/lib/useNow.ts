'use client';

import { useEffect, useState } from 'react';

/**
 * A ticking clock that is SSR-safe by construction.
 *
 * Returns **0 until the component has mounted**, then a live `Date.now()` on an
 * interval. The 0 matters: server render and first client render must produce
 * identical markup, so every consumer treats 0 as "fall back to build-time data"
 * (see eventPhase() in lib/eventPhase.ts). Reading Date.now() during render
 * instead would mismatch hydration on any date-dependent output.
 *
 * Pick the coarsest interval that still looks right — a per-second countdown
 * needs 1000, a list that only re-partitions when an event ends does not.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
