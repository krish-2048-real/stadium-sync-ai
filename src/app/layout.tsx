/**
 * Root Layout — StadiumSync AI
 *
 * Sets up the global HTML structure, Inter font from Google Fonts,
 * and dark-themed body styling.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StadiumSync AI — FIFA World Cup 2026",
  description:
    "AI-powered smart stadium dashboard for FIFA World Cup 2026 operations. Crowd management, multilingual PA, and sustainability monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
