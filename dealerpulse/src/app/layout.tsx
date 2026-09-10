import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/30">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
