import type { NextConfig } from "next";

import { SITE_URL } from "./src/lib/site";
import { TUTOR_SESSION_COOKIE } from "./src/lib/tutor-session-cookie";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /*
   * No page is ever embedded — the product is web-only, and Telegram opens
   * links in its own browser rather than a frame — so framing is refused
   * outright, which closes clickjacking on the admin and tutor screens.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },

      /*
       * Every page links these, and Next serves them with `max-age=0`, so a
       * browser asked for them again on each page view. That made the
       * manifest the second most-requested path, and each ask is a CDN
       * request against Hobby's monthly allowance. The icon links carry a
       * content hash (`/icon.svg?icon.<hash>.svg`), so a changed icon is a
       * new URL anyway. The manifest's URL has no hash, so it gets a day.
       */
      {
        source: "/:file(favicon\\.ico|icon\\.svg|apple-icon\\.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        source: "/icons/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },

  /*
   * `www.` is attached to the project too, and used to serve a full second
   * copy of the site: Google saw two of every page, and a tutor signed in
   * on one host was signed out on the other (the cookies are host-only).
   * Matched in the routing layer, so it never reaches a function.
   */
  async redirects() {
    const apex = new URL(SITE_URL);
    // `has` values are regular expressions.
    const wwwHost = `www.${apex.hostname}`.replace(/\./g, "\\.");

    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: wwwHost }],
        destination: `${apex.origin}/:path*`,
        permanent: true,
      },

      /*
       * `/legal` is signed-in-only, and every public page's footer links to
       * it. Without a session cookie there is nothing to check, so the visit
       * goes to sign in here, in the routing layer, rather than costing a
       * function invocation. The page still checks the session itself, for
       * a cookie that is present but no longer valid.
       */
      {
        source: "/legal",
        missing: [{ type: "cookie", key: TUTOR_SESSION_COOKIE }],
        destination: "/login?next=/legal",
        permanent: false,
      },
    ];
  },

  /*
   * A Telegram reader without an account gets the cached copy of the job
   * page, so the busiest public route costs no function invocation for them.
   * The cookie is only checked for presence here, at the edge; whoever has
   * one still gets the dynamic page, whose session check is unchanged (and
   * which shows the same signed-out view if the cookie turns out invalid).
   */
  async rewrites() {
    return [
      {
        source: "/apply/:jobCode",
        missing: [{ type: "cookie", key: TUTOR_SESSION_COOKIE }],
        destination: "/apply/:jobCode/guest",
      },
    ];
  },

  /*
   * PDFs read from disk at request time — paths the file tracer can't
   * follow on its own, so without these entries the files are left out of
   * the deployed functions: the assignment email's attendance sheet, and
   * the original certificates `/legal` links to.
   */
  outputFileTracingIncludes: {
    "/api/admin/applications/*/assign": ["src/assets/attendance-sheet.pdf"],
    "/api/legal/*": ["src/assets/legal/*.pdf"],
  },
  images: {
    /*
     * Both hosts are fixed, code-controlled URLs (the landing page's hero
     * photo and university favicons) — never user input — so the wildcard
     * `search` this leaves implied carries no injection risk.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
    ],
  },
};

export default nextConfig;
