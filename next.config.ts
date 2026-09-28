import type { NextConfig } from "next";

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
    ];
  },

  /*
   * The assignment email attaches this PDF, read from disk at send time —
   * a path the file tracer can't follow on its own, so without this entry
   * the file is left out of the deployed function.
   */
  outputFileTracingIncludes: {
    "/api/admin/applications/*/assign": ["src/assets/attendance-sheet.pdf"],
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
