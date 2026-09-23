"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fades and lifts its children in once they cross the viewport threshold.
 *
 * Pure IntersectionObserver + CSS transition — no animation library. Content
 * is present and readable in the DOM from the first paint (this only adds a
 * transition, never `display: none` or removed content), so JS-disabled and
 * crawler requests see everything unchanged.
 *
 * `prefers-reduced-motion` and any observer failure both resolve to "already
 * revealed" — the feature can only ever show more, never hide content. Always
 * renders a `div`; wrap it in an `li` at the call site for list contexts.
 */
export function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Stagger, in ms. */
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;

    const skipObserving =
      !node ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (skipObserving) {
      // Deferred a tick rather than called synchronously in the effect body:
      // a same-tick `setState` here would trigger a cascading render.
      queueMicrotask(() => setRevealed(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: revealed ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-700 ease-out",
        revealed ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
