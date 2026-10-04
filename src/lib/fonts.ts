import { Fraunces } from "next/font/google";

/**
 * Display face for headlines. Fraunces is variable: `opsz` lets large
 * headings use the high-contrast display cut, and `SOFT` rounds the
 * terminals slightly so it reads warm rather than bookish.
 *
 * Declared here rather than in the root layout, which preloaded it on every
 * page: next/font preloads a font only on the routes whose modules import
 * it. Just three pages use it — the landing page, the tutor dashboard and
 * the parent-facing tutor profile — and its two files (~265 KB) were most of
 * what a job page downloaded, on the phones and connections tutors arrive
 * from Telegram with. Each of those pages puts `fraunces.variable` on the
 * element wrapping its `font-display` / `font-serif` text; anywhere else
 * those utilities fall back to the system serif.
 *
 * It stays preloaded on those pages: measured without the preload, the
 * landing page's first paint got slower, because the browser found the font
 * only after laying out the headline. (A page that prefetches `/` still
 * fetches it once, via the home page's preload hint, then has it cached.)
 */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});
