import type { Metadata } from "next";

import { OPEN_GRAPH_DEFAULTS, SITE_NAME } from "@/lib/site";

const SHARE_TITLE = "A tutor profile for your family";
const SHARE_DESCRIPTION = `See this tutor's education, exam scores and documents, shared privately with your family by ${SITE_NAME}.`;

/*
 * Everything under `/tutor-profile` is for parents: the shared profile, and
 * the 404 that a revoked, expired or mistyped link shows (`not-found.tsx`).
 * Set here rather than on the page so that 404 gets it too: a family that
 * forwards an old link should still see this card, not the site's tutor-
 * recruiting one.
 *
 * Reachable by anyone holding the link, so it stays out of search engines,
 * and the token stays out of the Referer sent to other hosts.
 *
 * The Open Graph tags are what Telegram and WhatsApp show when an admin
 * pastes the link to a family. They name no tutor: the preview is fetched
 * by the chat app's servers, and nothing about the tutor needs to leave the
 * page itself. The banner (`public/og-tutor-profile.jpg`) is a ~100 KB
 * JPEG; WhatsApp tends to drop preview images much over 300 KB.
 */
export const metadata: Metadata = {
  title: "Tutor profile",
  description: SHARE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [
      {
        url: "/og-tutor-profile.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — the right tutor, chosen with care`,
      },
    ],
  },
};

export default function TutorProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
