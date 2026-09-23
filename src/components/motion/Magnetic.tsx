"use client";

import * as React from "react";

/**
 * Wraps a single child (typically a CTA button) and nudges it toward the
 * cursor within a small radius — a "magnetic" hover, common on premium
 * product sites.
 *
 * Skipped entirely on touch/coarse-pointer devices (the effect is
 * meaningless without a hovering cursor) and under `prefers-reduced-motion`.
 * On both, this renders `children` untouched — never a worse experience than
 * not having the wrapper at all.
 */
export function Magnetic({
  children,
  strength = 18,
}: {
  children: React.ReactElement;
  /** Max pixels of travel toward the cursor. */
  strength?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const fine = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Deferred a tick rather than called synchronously in the effect body:
    // a same-tick `setState` here would trigger a cascading render.
    queueMicrotask(() => setEnabled(fine && !reduced));
  }, []);

  function handleMove(event: React.MouseEvent<HTMLSpanElement>) {
    if (!enabled || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

    ref.current.style.transform = `translate(${relativeX * strength}px, ${relativeY * strength}px)`;
  }

  function handleLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "translate(0, 0)";
  }

  return (
    <span
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="inline-block transition-transform duration-300 ease-out will-change-transform"
    >
      {children}
    </span>
  );
}
