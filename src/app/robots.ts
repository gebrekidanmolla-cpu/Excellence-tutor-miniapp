import type { MetadataRoute } from "next";

/**
 * Keeps crawlers on the public pages. The admin, the tutor portal, the API
 * and the parent-facing profile links are either signed-in or private by
 * token, so there is nothing there a search engine should list.
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
        "/jobs",
        "/reset-password",
        "/application-success",
      ],
    },
  };
}
