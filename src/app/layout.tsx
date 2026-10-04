import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import {
  OPEN_GRAPH_DEFAULTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/* Only small runs of text use it (job codes, counts), so it isn't worth a
   high-priority download competing with the page's own CSS and scripts:
   the browser fetches it once such text is on screen. The headline face,
   Fraunces, lives in `src/lib/fonts.ts`. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const DEFAULT_TITLE = `${SITE_NAME} — Home tutoring jobs across Ethiopia`;

/*
 * No `alternates.canonical` here: a layout's value is inherited by every
 * page below it, which would point them all at the home page. Each
 * indexable page sets its own.
 *
 * Next.js copies the Open Graph title, description and image (see
 * `OPEN_GRAPH_DEFAULTS`) into the Twitter card tags.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "education",
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}

        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
