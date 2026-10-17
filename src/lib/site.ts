/**
 * The site's public identity, read by the root metadata, the sitemap,
 * `robots.txt`, the structured data and the `www.` redirect.
 *
 * `SITE_URL` is a constant rather than `NEXT_PUBLIC_APP_URL` on purpose:
 * canonical links and sitemap entries must name the production origin in
 * every build — a preview or local build that wrote its own origin into
 * them would tell Google that copy is the real page. (Previews are kept out
 * of the index anyway, by Vercel's `X-Robots-Tag: noindex`.)
 */
export const SITE_URL = "https://excellencehometutor.com";

/** The name Google shows above the result; keep it the same everywhere. */
export const SITE_NAME = "Excellence Tutor";

/** What the domain spells out — a second name people may search for. */
export const SITE_ALTERNATE_NAME = "Excellence Home Tutor";

export const SITE_DESCRIPTION =
  "Home tutoring jobs across Ethiopia. Build one tutor profile, apply to real jobs from families in minutes, and follow every application on your dashboard.";

/**
 * A page that sets `openGraph` replaces the layout's whole object rather
 * than merging into it, so each one spreads these back in.
 *
 * The share image is listed here rather than left to the
 * `opengraph-image.png` file convention, because that convention's image is
 * dropped from any page that sets its own `openGraph` — the job pages, the
 * links most often pasted into chats, among them. Next.js copies it into
 * the Twitter card tags.
 */
export const OPEN_GRAPH_DEFAULTS = {
  siteName: SITE_NAME,
  type: "website" as const,
  locale: "en_US",
  images: [
    {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} — home tutoring jobs across Ethiopia`,
    },
  ],
};

/**
 * At least 112 px square, which Google's logo guidelines require. Served
 * from the `src/app/apple-icon.png` file convention, whose bare path keeps
 * working alongside the hashed one Next.js puts in the `<link>` tag.
 */
export const SITE_LOGO_URL = `${SITE_URL}/apple-icon.png`;
