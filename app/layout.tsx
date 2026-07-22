import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ChudModeProvider } from "@/components/chud-mode-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Parental PTO",
  description: "A shared PTO ledger for two-parent households",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
          {children}
          <Toaster />
        </ChudModeProvider>
      </body>
    </html>
  );
}
