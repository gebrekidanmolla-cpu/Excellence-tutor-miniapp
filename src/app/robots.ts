import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Keeps crawlers on the public pages. The admin, the tutor portal, the API
 * and the parent-facing profile links are either signed-in or private by
 * token, so there is nothing there a search engine should list.
 *
 * `/jobs` is deliberately *not* blocked, even though it is signed-in-only:
 * every public page links to it, and Google lists a blocked URL it keeps
 * finding links to anyway — as a bare "No information is available for
 * this page" result under the brand name. Left crawlable, it answers with
 * its redirect to `/login`, and Google drops it. `/forgot-password` is
 * crawlable for the same reason and carries `noindex` instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/tutor",
        "/tutor-profile/",
        "/reset-password",
        "/application-success",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
