import type { Metadata, Viewport } from "next";
import { Anton, Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Anton — heavy, condensed, uppercase — the closest free match to a Supercell
// wordmark, used only on the cold-start intro splash (ported from the reference).
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Space Grotesk gives headings + big numbers a crisp, modern-SaaS character
// that the neutral body sans doesn't. Wired to --font-heading in globals.css.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

import { Suspense } from "react";
import { THEME_INIT } from "@/components/layout/theme";
import { AutomotiveBackdrop } from "@/components/layout/automotive-backdrop";
import { AppHeader } from "@/components/layout/app-header";
import { IntroSplash } from "@/components/layout/intro-splash";
import { RouteProgress } from "@/components/layout/route-progress";

// Runs before paint: on a same-tab refresh (flag already set) it stamps
// data-intro-seen so the splash never flashes; on a fresh tab it sets the flag
// so the splash shows this once. sessionStorage is cleared when the tab closes,
// so reopening a closed tab greets again — but a refresh does not. A `?intro=1`
// query param forces the reveal regardless — handy for testing
// or demoing without opening a brand-new tab.
const INTRO_GATE = `try{if(location.search.indexOf('intro=1')>-1){sessionStorage.removeItem('dp-intro-seen')}else if(sessionStorage.getItem('dp-intro-seen')){document.documentElement.setAttribute('data-intro-seen','1')}else{sessionStorage.setItem('dp-intro-seen','1')}}catch(e){}`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "DealerPulse · Feel your data",
  description:
    "DealerPulse reads the vital signs of your dealership group · the pulse of every branch, rep, and deal · so you can see what's healthy, what's at risk, and act on it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${anton.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="relative isolate min-h-full flex flex-col bg-background">
        <AutomotiveBackdrop />
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <IntroSplash />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
