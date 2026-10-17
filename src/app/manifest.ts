import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * What a phone uses when the site is added to its home screen: the name
 * under the icon and a sharp icon instead of the 48 px favicon.
 *
 * `display: "browser"` on purpose — the shortcut opens the site in the
 * normal browser. A standalone app window on iOS keeps its own cookie jar,
 * so a tutor signed in on the site would find themselves signed out in it.
 *
 * The PNGs in `public/icons` are rendered from `src/app/icon.svg`; the
 * maskable one is full-bleed, with the mark inside the safe zone Android
 * crops to.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Excellence",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
