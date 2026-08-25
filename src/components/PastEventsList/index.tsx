'use client';

import React, { useMemo, useState } from 'react';
import EventCard from '../EventCard';
import OaiFooter from '../OaiFooter';
import { asset } from '@/lib/basePath';
import { splitByPhase } from '@/lib/eventPhase';
import { useNow } from '@/lib/useNow';

interface Speaker {
  name: string;
  position: string;
  photo: string;
}

interface EventItem {
  title: string;
  permalink: string;
  date: string;
  location: string;
  type: string;
  status: string;
  image: string;
  startDate?: string;
  endDate?: string;
  speakers: Speaker[];
}

interface PastEventsListProps {
  items: EventItem[];
  scheduledItems?: EventItem[];
}

export default function PastEventsList({ items, scheduledItems = [] }: PastEventsListProps) {
  const [displayCount, setDisplayCount] = useState(6);

  const now = useNow(30_000);
  const { past } = useMemo(
    () => splitByPhase(scheduledItems, items, now),
    [scheduledItems, items, now],
  );

  const displayedEvents = past.slice(0, displayCount);
  const hasMore = displayCount < past.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 6);
  };

  return (
    <main className="min-h-screen bg-brand-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-12 pt-16 md:pb-20 md:pt-24">
        <div className="relative z-10 mx-auto max-w-[1408px] px-6 md:px-[104px]">
          <div className="flex items-start gap-5">
            {/* Green vertical accent bar (hidden on mobile) */}
            <div
              className="mt-2 hidden w-[4px] flex-shrink-0 rounded-full bg-brand-green md:block"
              style={{ height: 48 }}
            />
            <div className="flex-1">
              <h1 className="m-0 font-onest text-[48px] font-bold leading-[100%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[80px]">
                Past events
              </h1>
              <p className="text-[color:var(--ifm-font-color-base)]/90 m-0 mt-6 max-w-[800px] font-onest text-xl font-normal leading-[140%] tracking-oai md:text-[28px]">
                Explore events and conferences from previous years
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid Section */}
      <section className="mx-auto mb-12 max-w-[1408px] md:px-6">
        {displayedEvents.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {displayedEvents.map((item) => (
              <EventCard
                key={item.permalink}
                title={item.title}
                date={item.date}
                location={item.location}
                image={item.image}
                type={item.type}
                permalink={item.permalink}
                status={item.status as 'active' | 'upcoming' | 'finished'}
                startDate={item.startDate}
                endDate={item.endDate}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-12 flex justify-center px-6 md:mt-20 md:px-0">
            <button
              onClick={handleLoadMore}
              className="btn-green inline-flex h-[56px] cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-[20px] border-none px-6 py-1.5 font-onest text-base font-bold tracking-oai text-[#15191c] transition-colors duration-200 md:h-[64px] md:text-lg"
            >
              More
              <img src={asset('/img/shevron_icon.svg')} alt="" aria-hidden className="h-4 w-auto" />
            </button>
          </div>
        )}
      </section>

      {/* Footer */}
      <OaiFooter />
    </main>
  );
}
