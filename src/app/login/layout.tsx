import type { Metadata } from "next";

import { OPEN_GRAPH_DEFAULTS, SITE_NAME } from "@/lib/site";

const title = "Tutor sign in";
const description = `Sign in to your ${SITE_NAME} account to browse home tutoring jobs, apply in a couple of taps and track every application.`;

/* The page is a client component, which cannot export metadata. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/login" },
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: "/login" },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
