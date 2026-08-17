import React from 'react';
import { asset } from '@/lib/basePath';

/**
 * Renders a monochrome SVG from /public as a CSS mask filled with the current
 * text colour. The source SVGs ship with a hard-coded white fill, which would
 * be invisible in light mode; masking with `background-color: currentColor`
 * lets them inherit the surrounding `text-*` colour and hover state instead,
 * and any transparent cut-outs (the LinkedIn "in", the play triangle) show the
 * background through, exactly like the originals.
 */
export default function MaskIcon({
  src,
  size = 24,
  className = '',
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  const url = `url(${asset(src)})`;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}
