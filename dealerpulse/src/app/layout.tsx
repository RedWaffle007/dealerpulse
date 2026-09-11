import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "DealerPulse — Dealership Performance",
  description:
    "Real-time dealership performance dashboard: overview, drill-down, and an action center for a 5-branch dealer group.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/30">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
