'use client';

import { useCallback, useRef } from 'react';

// How far the pointer must travel before it counts as a drag rather than a
// click. Below this, a slightly-shaky click on a thumbnail still selects it.
const DRAG_THRESHOLD = 4;

/**
 * Click-and-drag horizontal scrolling for an overflow-x container.
 *
 * Only mouse input is hijacked — touch devices already pan these rows natively,
 * and taking over their pointer events would break momentum scrolling.
 *
 * Spread `dragProps` onto the scroll container and attach `ref`. Pair it with
 * the `.no-scrollbar` utility so the row is dragged rather than scrolled by a
 * visible bar.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = ref.current;
    // Nothing to drag when the content already fits.
    if (!el || el.scrollWidth <= el.clientWidth) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved) {
      if (Math.abs(dx) <= DRAG_THRESHOLD) return;
      drag.current.moved = true;
      // Capture only once this is a real drag, never on a plain click: while a
      // pointer is captured the browser retargets the resulting `click` to the
      // capturing container, which would stop thumbnail clicks from selecting.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* drag still works, it just stops tracking outside the element */
      }
    }
    el.scrollLeft = drag.current.startScroll - dx;
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current.active = false;
  }, []);

  // Swallow the click that terminates a drag, so dragging across a thumbnail
  // doesn't also select it. Capture phase, so it runs before the child's
  // onClick. `moved` is reset on the next pointerdown.
  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.moved) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current.moved = false;
  }, []);

  return {
    ref,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
}
