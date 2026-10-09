import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeSync } from "@/components/layout/ThemeSync";
import { Toaster } from "@/components/ui/sonner";
import {
  OPEN_GRAPH_DEFAULTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import { SCHEME_QUERIES, THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";

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

/*
 * The browser chrome follows the OS theme by default. A theme picked by hand
 * re-points the two tags' `media` (`THEME_INIT_SCRIPT`, then `applyTheme`).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: SCHEME_QUERIES.light, color: THEME_COLORS.light },
    { media: SCHEME_QUERIES.dark, color: THEME_COLORS.dark },
  ],
};

/*
 * The theme is applied by a blocking inline script rather than by reading a
 * cookie here, which would make every page dynamic. The script adds the
 * `dark` class before React hydrates, hence `suppressHydrationWarning`.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeSync />
        {children}

        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
