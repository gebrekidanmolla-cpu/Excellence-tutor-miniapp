"use client";

import * as React from "react";
import Link from "next/link";

/**
 * A `<Link>` that prefetches only once someone shows intent — a pointer
 * over it, a finger on it, keyboard focus — rather than as soon as it
 * scrolls into view (the hover-prefetch pattern from the Next.js
 * prefetching guide).
 *
 * For links to a heavy route most visitors never open. Prefetching
 * `/register` from the landing page and every job page downloaded and parsed
 * the whole register wizard — ~150 KB of scripts, most of it the form's
 * validation — on every visit, and that parse was most of the main-thread
 * work after load on a phone. On touch screens the prefetch still starts
 * when the finger lands, a beat before the tap completes.
 */
export function IntentLink({
  onPointerEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = React.useState(false);

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
