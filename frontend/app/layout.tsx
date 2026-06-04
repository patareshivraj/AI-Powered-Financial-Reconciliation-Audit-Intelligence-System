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

export const metadata: Metadata = {
  title: "BANK AI — Financial Reconciliation & Transaction Intelligence",
  description: "Fintech-grade AI-powered financial reconciliation platform.",
};

import { SimulationLoginOverlay } from "@/features/auth/components/simulation-login";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-neutral-950 text-neutral-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        <SimulationLoginOverlay>
          {children}
        </SimulationLoginOverlay>
      </body>
    </html>
  );
}

