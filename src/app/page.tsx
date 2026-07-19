/**
 * StadiumSync AI — Main Dashboard Page
 *
 * The central command center for FIFA World Cup 2026 stadium operations.
 * Renders three AI-powered modules: Crowd Management, Multilingual PA, Sustainability.
 *
 * Uses semantic HTML5, WCAG 2.1 AA compliant layout, and efficient component composition.
 */

import React from "react";
import CrowdManagement from "@/components/CrowdManagement";
import MultilingualAssistant from "@/components/MultilingualAssistant";
import Sustainability from "@/components/Sustainability";

/* ------------------------------------------------------------------ */
/*  Metadata (Next.js App Router)                                      */
/* ------------------------------------------------------------------ */

export const metadata = {
  title: "StadiumSync AI — FIFA World Cup 2026 Smart Stadium Dashboard",
  description:
    "AI-powered operational intelligence for FIFA World Cup 2026 stadium management. Real-time crowd control, multilingual PA announcements, and sustainability monitoring.",
  keywords: [
    "FIFA World Cup 2026",
    "stadium management",
    "crowd control AI",
    "smart stadium",
    "sustainability",
  ],
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * DashboardPage Component
 *
 * The root page layout assembling the Crowd Management, Multilingual Assistant,
 * and Sustainability modules.
 *
 * @returns {React.ReactElement} The main dashboard page layout
 */
export default function DashboardPage(): React.ReactElement {
  return (
    <>
      {/* Skip-to-content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Navigation Header */}
      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Branding */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-white text-sm font-black">SS</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  StadiumSync
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {" "}
                    AI
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest -mt-0.5">
                  FIFA World Cup 2026 Operations
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live Data Feed
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300 rounded-full">
                Gemini AI Active
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Hero */}
        <header className="mb-8">
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/5 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Smart Stadium Command Center
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
              Real-time operational intelligence powered by Google Gemini AI.
              Monitor crowd flow, manage multilingual announcements, and optimize
              energy efficiency across all stadium zones.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20">
                👥 Crowd Analytics
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-purple-500/10 text-purple-300 rounded-full border border-purple-500/20">
                🌐 8+ Languages
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-green-500/10 text-green-300 rounded-full border border-green-500/20">
                🌱 Carbon Tracking
              </span>
            </div>
          </div>
        </header>

        {/* Module Grid */}
        <div className="space-y-8">
          {/* Row 1: Crowd Management (full width) */}
          <CrowdManagement />

          {/* Row 2: Translation & Sustainability side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MultilingualAssistant />
            <Sustainability />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-600">
            StadiumSync AI — FIFA World Cup 2026 Stadium Operations Dashboard
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Powered by Google Gemini AI • Simulated Data for Demonstration
          </p>
        </footer>
      </main>
    </>
  );
}
