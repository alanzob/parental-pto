import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ChudModeProvider } from "@/components/chud-mode-provider";
import { BetaBanner } from "@/components/beta-banner";

// Editorial × drafting type system:
//  - IBM Plex Sans  → body / forms (humanist workhorse)
//  - IBM Plex Mono  → labels, annotations, all figures (drafting voice)
//  - Newsreader     → serif display headings (editorial gravitas)
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const SITE_URL = "https://parental-pto.vercel.app";
const TITLE = "MyTO — time to be you";
const DESCRIPTION =
  "A shared ledger for two people who trade off, so neither of you has to keep score in your head. Especially for parents, who need it most.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "MyTO",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale/userScalable lock — pinch-zoom stays available for accessibility.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1214" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        {/* Applied before hydration so returning high-contrast users don't
         * see a flash of the normal theme on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try { if (localStorage.getItem('parental-pto-high-contrast') === '1') document.documentElement.classList.add('high-contrast'); } catch (e) {}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ChudModeProvider>
          <BetaBanner />
          {children}
          <Toaster />
        </ChudModeProvider>
      </body>
    </html>
  );
}
