import React from 'react';
import { asset } from '@/lib/basePath';
import SpeakerBadge from '../SpeakerBadge';

interface SpeakerCardProps {
  name: string;
  position: string;
  photo: string;
  variant?: 'dark' | 'light';
  badges?: string[];
}

export default function SpeakerCard({ name, position, photo, badges = [] }: SpeakerCardProps) {
  // Dark mode: #15191C base + 4% white overlay = #1E2225 (blended solid).
  return (
    <div className="tile-press flex h-[180px] w-full flex-row items-center overflow-hidden rounded-[40px] bg-white [[data-theme=dark]_&]:bg-[#1e2225] md:w-[428px]">
      {/* Text side — 248px × 180px, padding 16px 24px, gap 8px */}
      <div className="flex h-[180px] flex-1 flex-col items-start justify-center gap-2 px-6 py-4 md:w-[248px] md:flex-none">
        {/* Name container — flex-row, gap 8px */}
        <div className="flex flex-row items-center gap-2">
          <span className="font-onest text-base font-bold leading-[120%] tracking-oai text-[#15191C] [[data-theme=dark]_&]:text-white">
            {name}
          </span>
          {badges.map((b) => (
            <SpeakerBadge key={b} label={b} />
          ))}
        </div>
        {/* Position — Onest 400 16px, line-height 140% */}
        <span className="line-clamp-2 max-w-[200px] font-onest text-base font-normal leading-[140%] tracking-oai text-[#15191C] [[data-theme=dark]_&]:text-white">
          {position}
        </span>
      </div>
      {/* Photo side — 180×180, semi-circular left edge */}
      <div
        className="h-[180px] w-[180px] flex-shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${asset(photo)})`,
          borderRadius: '200px 0px 0px 200px',
        }}
      />
    </div>
  );
}
