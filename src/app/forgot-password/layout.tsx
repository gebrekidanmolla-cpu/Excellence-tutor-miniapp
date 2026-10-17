import type { Metadata } from "next";

/*
 * Crawlable (the footer links here), but a recovery step is no search
 * result. The page is a client component, which cannot export metadata.
 */
export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
