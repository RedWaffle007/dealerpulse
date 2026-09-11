import type { Metadata } from "next";
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

import { AppHeader } from "@/components/layout/app-header";
import { IntroSplash } from "@/components/layout/intro-splash";

// Runs before paint: on a same-tab refresh (flag already set) it stamps
// data-intro-seen so the splash never flashes; on a fresh tab it sets the flag
// so the splash shows this once. sessionStorage is cleared when the tab closes,
// so reopening a closed tab greets again — but a refresh does not.
const INTRO_GATE = `try{if(sessionStorage.getItem('dp-intro-seen')){document.documentElement.setAttribute('data-intro-seen','1')}else{sessionStorage.setItem('dp-intro-seen','1')}}catch(e){}`;

export const metadata: Metadata = {
  title: "DealerPulse — Feel your data",
  description:
    "DealerPulse reads the vital signs of your dealership group — the pulse of every branch, rep, and deal — so you can see what's healthy, what's at risk, and act on it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${anton.variable} h-full antialiased`}
    >
      <head>
        {/* Warm the intro strike so it is cached before hydration — the splash
            decodes it via Web Audio and fires it in sync with the wordmark. */}
        <link rel="preload" as="audio" href="/tick.mp3" type="audio/mpeg" />
      </head>
      <body className="min-h-full flex flex-col bg-muted/30">
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <IntroSplash />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
