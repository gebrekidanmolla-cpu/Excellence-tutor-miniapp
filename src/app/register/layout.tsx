import type { Metadata } from "next";

import { OPEN_GRAPH_DEFAULTS } from "@/lib/site";

const title = "Become a home tutor";
const description =
  "Register as a home tutor in Ethiopia. Build one profile with your education and documents, then apply to tutoring jobs from families across the country.";

/* The wizard is a client component, which cannot export metadata. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/register" },
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: "/register" },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
