/**
 * Where to send a tutor after signing in or registering, taken from a
 * `?next=` query value — so a tutor who arrives from a Telegram post at
 * `/apply/<code>` lands back on that job instead of the dashboard.
 *
 * Only same-site paths are accepted. `//evil.com` and `/\evil.com` are
 * protocol-relative to a browser, so they are refused along with anything
 * absolute. Control characters are refused too: browsers strip tabs and
 * newlines from URLs, which turns `/<tab>/evil.com` into `//evil.com`.
 * Everything refused falls back to `fallback`.
 *
 * Safe to import from client components.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/tutor"
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    [...value].some((char) => char.charCodeAt(0) < 0x20)
  ) {
    return fallback;
  }

  return value;
}

/** Reads `?next=` from the current URL. Call from event handlers only. */
export function nextPathFromLocation(fallback = "/tutor"): string {
  return safeNextPath(
    new URLSearchParams(window.location.search).get("next"),
    fallback
  );
}
