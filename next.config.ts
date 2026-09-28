import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
