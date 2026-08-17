import React from 'react';

// Tooltips for the badges we know about. Unknown codes still render — the label
// is just shown without a title, so a new badge needs no code change here.
const BADGE_TITLES: Record<string, string> = {
  TSC: 'Technical Steering Committee member',
  OAI: 'OpenAPI Initiative member',
};

/**
 * The small green badge shown after a speaker's name (TSC, OAI, …).
 * Dark text on brand green. Per the design the shape is asymmetric: the left
 * edge is a full semicircle, the right edge is essentially square (1px) —
 * border-radius order is top-left, top-right, bottom-right, bottom-left, so the
 * large values sit on the two left corners.
 */
export default function SpeakerBadge({ label }: { label: string }) {
  const code = label.toUpperCase();
  return (
    <span
      title={BADGE_TITLES[code]}
      className="inline-flex h-5 flex-shrink-0 items-center whitespace-nowrap rounded-[9999px_1px_1px_9999px] bg-brand-green px-1.5 py-0.5 font-onest text-[10px] font-semibold uppercase leading-none tracking-wider text-[#15191c] md:text-[11px]"
    >
      {code}
    </span>
  );
}
