/**
 * CrowdManagement Component
 *
 * Displays real-time gate utilization data, dynamic stadium navigation paths,
 * multi-modal transportation hubs (train arrivals/parking lots), real-time venue crowd density,
 * and AI-generated FIFA World Cup 2026 operations intelligence.
 *
 * Optimised with React.useMemo, React.useCallback, and strict null/undefined safety.
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import type {
  CrowdManagementRequest,
  CrowdManagementResponse,
  GateData,
  TransportationHub,
  NavigationPath,
  ZoneDensityData,
  GenAIApiResponse,
} from "@/types/stadium";
import { generateCrowdData } from "@/lib/simulatedData";
import ErrorBoundary from "./ErrorBoundary";

/* ------------------------------------------------------------------ */
/*  Sub-Components (Memoised for Max Efficiency)                      */
/* ------------------------------------------------------------------ */

/**
 * Visual indicator for gate utilization level.
 */
const UtilizationBadge = React.memo(function UtilizationBadge({ percent }: { percent: number }) {
  const p = percent ?? 0;
  let colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  let label = "Normal";

  if (p > 100) {
    colorClass = "bg-red-500/20 text-red-300 border-red-500/30";
    label = "Over Capacity";
  } else if (p > 80) {
    colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    label = "High";
  } else if (p > 60) {
    colorClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    label = "Moderate";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}
      role="status"
      aria-label={`Utilization: ${p}% — ${label}`}
    >
      {p}% — {label}
    </span>
  );
});

/**
 * Renders a single gate data card.
 */
const GateCard = React.memo(function GateCard({ gate }: { gate: GateData }) {
  const g = gate ?? {};
  const gateId = g.gateId ?? "Unknown Gate";
  const currentWaitTime = g.currentWaitTime ?? 0;
  const capacity = g.capacity ?? 1;
  const utilizationPercent = g.utilizationPercent ?? 0;
  const zone = g.zone ?? "general";

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{gateId}</h4>
        <span className="text-xs text-slate-400 uppercase tracking-wide">
          {zone}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Wait Time</span>
          <span className="font-mono">{currentWaitTime} min</span>
        </div>
        <div className="flex justify-between text-xs text-slate-300">
          <span>Capacity</span>
          <span className="font-mono">{capacity}/min</span>
        </div>
        <div
          className="w-full bg-slate-700 rounded-full h-1.5 mt-1"
          role="progressbar"
          aria-valuenow={utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${gateId} utilization`}
        >
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              utilizationPercent > 100
                ? "bg-red-500"
                : utilizationPercent > 80
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
        </div>
        <UtilizationBadge percent={utilizationPercent} />
      </div>
    </div>
  );
});

/**
 * Renders alert level badge for the AI response.
 */
const AlertLevelBadge = React.memo(function AlertLevelBadge({ level }: { level: string }) {
  const l = level ?? "moderate";
  const styles: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    moderate: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    critical: "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full border ${
        styles[l] ?? styles.moderate
      }`}
      role="alert"
      data-testid="crowd-alert-badge"
    >
      ⚡ {l.toUpperCase()} ALERT
    </span>
  );
});

/**
 * Renders a single transportation hub status card.
 */
const TransportationHubCard = React.memo(function TransportationHubCard({
  hub,
}: {
  hub: TransportationHub;
}) {
  const h = hub ?? {};
  const hubId = h.hubId ?? "Unknown Hub";
  const mode = h.mode ?? "pedestrian";
  const currentThroughput = h.currentThroughput ?? 0;
  const maxCapacity = h.maxCapacity ?? 1;
  const status = h.status ?? "operational";
  const estimatedWait = h.estimatedWaitMinutes ?? 0;

  let statusColor = "text-emerald-400 bg-emerald-500/10";
  if (status === "congested") statusColor = "text-amber-400 bg-amber-500/10";
  if (status === "closed") statusColor = "text-red-400 bg-red-500/10";
  if (status === "diverting") statusColor = "text-purple-400 bg-purple-500/10";

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{hubId}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${statusColor}`}>
          {status}
        </span>
      </div>
      <div className="space-y-1 text-xs text-slate-300">
        <div className="flex justify-between">
          <span>Transit Mode</span>
          <span className="capitalize">{mode}</span>
        </div>
        <div className="flex justify-between">
          <span>Throughput</span>
          <span>
            {currentThroughput}/{maxCapacity} min
          </span>
        </div>
        <div className="flex justify-between">
          <span>Wait Time</span>
          <span className="font-mono">{estimatedWait} min</span>
        </div>
        {h.nextArrival && (
          <div className="flex justify-between text-[10px] text-slate-400 border-t border-white/5 pt-1 mt-1">
            <span>Next Arrival</span>
            <span>{new Date(h.nextArrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Renders a single dynamic navigation path card.
 */
const NavigationPathCard = React.memo(function NavigationPathCard({
  path,
}: {
  path: NavigationPath;
}) {
  const p = path ?? {};
  const from = p.from ?? "";
  const to = p.to ?? "";
  const est = p.estimatedMinutes ?? 0;
  const congestion = p.congestionPercent ?? 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {p.pathId ?? "Path"}
        </span>
        {p.isWheelchairAccessible && (
          <span className="text-xs" title="Wheelchair Accessible">
            ♿
          </span>
        )}
      </div>
      <div className="text-sm font-medium text-white mb-2 truncate">
        {from} ➔ {to}
      </div>
      <div className="space-y-1 text-xs text-slate-300">
        <div className="flex justify-between">
          <span>Traversal Est.</span>
          <span className="font-mono">{est} min</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Congestion</span>
          <span className={`font-mono font-bold ${congestion > 75 ? "text-red-400" : "text-slate-300"}`}>
            {congestion}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
          <div
            className={`h-1 rounded-full ${
              congestion > 75 ? "bg-red-500" : congestion > 40 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${congestion}%` }}
          />
        </div>
      </div>
    </div>
  );
});

/**
 * Renders a single zone density heatmap row.
 */
const ZoneDensityRow = React.memo(function ZoneDensityRow({
  density,
}: {
  density: ZoneDensityData;
}) {
  const z = density ?? {};
  const zoneId = z.zoneId ?? "Unknown Zone";
  const type = z.zoneType ?? "seating";
  const count = z.currentCount ?? 0;
  const max = z.maxOccupancy ?? 1;
  const percent = z.densityPercent ?? 0;
  const trend = z.trend ?? "stable";

  let statusColor = "text-emerald-400";
  if (percent > 85) statusColor = "text-red-400";
  else if (percent > 60) statusColor = "text-amber-400";

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{zoneId}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 uppercase rounded">
            {type}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Count: {count.toLocaleString()} / {max.toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <span className={`text-sm font-bold ${statusColor}`}>{percent}%</span>
          <span className="block text-[10px] text-slate-500 capitalize">
            {trend === "increasing" ? "📈 Rising" : trend === "decreasing" ? "📉 Falling" : "➡️ Stable"}
          </span>
        </div>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Inner Operational Component                                        */
/* ------------------------------------------------------------------ */

function CrowdManagementInner() {
  const [crowdData, setCrowdData] = useState<CrowdManagementRequest | null>(null);
  const [aiResponse, setAiResponse] = useState<CrowdManagementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generates simulated operations data and fetches Gemini operational intelligence analysis.
   */
  const analyzeGates = useCallback(async () => {
    setLoading(true);
    setError(null);

    const data = generateCrowdData();
    setCrowdData(data);

    try {
      const response = await fetch("/api/genai-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "crowd-management",
          crowdData: data,
        }),
      });

      const result: GenAIApiResponse<CrowdManagementResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get AI analysis");
      }

      setAiResponse(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoised sub-lists to avoid unnecessary mapping loops on every render
  const renderedGates = useMemo(() => {
    return crowdData?.gates?.map((gate) => (
      <GateCard key={gate.gateId} gate={gate} />
    )) ?? null;
  }, [crowdData?.gates]);

  const renderedHubs = useMemo(() => {
    return crowdData?.transportationHubs?.map((hub) => (
      <TransportationHubCard key={hub.hubId} hub={hub} />
    )) ?? null;
  }, [crowdData?.transportationHubs]);

  const renderedPaths = useMemo(() => {
    return crowdData?.navigationPaths?.map((path) => (
      <NavigationPathCard key={path.pathId} path={path} />
    )) ?? null;
  }, [crowdData?.navigationPaths]);

  const renderedDensity = useMemo(() => {
    return crowdData?.zoneDensity?.map((density) => (
      <ZoneDensityRow key={density.zoneId} density={density} />
    )) ?? null;
  }, [crowdData?.zoneDensity]);

  const renderedSuggestions = useMemo(() => {
    return aiResponse?.deploymentSuggestions?.map((suggestion, idx) => (
      <div
        key={idx}
        className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3"
      >
        <span
          className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded uppercase ${
            (suggestion.priority ?? "medium") === "urgent"
              ? "bg-red-500/30 text-red-300"
              : (suggestion.priority ?? "medium") === "high"
              ? "bg-orange-500/30 text-orange-300"
              : (suggestion.priority ?? "medium") === "medium"
              ? "bg-yellow-500/30 text-yellow-300"
              : "bg-slate-500/30 text-slate-300"
          }`}
        >
          {suggestion.priority ?? "medium"}
        </span>
        <div>
          <p className="text-sm font-medium text-white">
            {suggestion.location ?? "N/A"}
          </p>
          <p className="text-xs text-slate-400">{suggestion.action ?? "N/A"}</p>
        </div>
      </div>
    )) ?? null;
  }, [aiResponse?.deploymentSuggestions]);

  return (
    <section
      aria-labelledby="crowd-management-heading"
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg shadow-lg shadow-blue-500/20">
            👥
          </div>
          <div>
            <h2
              id="crowd-management-heading"
              className="text-xl font-bold text-white"
            >
              Crowd Management & Operations
            </h2>
            <p className="text-xs text-slate-400">
              FIFA World Cup 2026 Ingress, Transit Hubs, Navigation & Crowd Density Heatmap
            </p>
          </div>
        </div>
        <button
          onClick={analyzeGates}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Analyze gate wait times with AI"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  className="opacity-75"
                />
              </svg>
              Analyzing…
            </span>
          ) : (
            "🔍 Analyze Gates & Hubs"
          )}
        </button>
      </div>

      {/* Primary Grid Layout */}
      {crowdData && (
        <div className="space-y-6">
          {/* Gate status row */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Gate Status — {crowdData.gates?.length ?? 0} gates monitored
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Occupancy: {(crowdData.totalOccupancy ?? 0).toLocaleString()} /{" "}
                {(crowdData.maxCapacity ?? 88000).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {renderedGates}
            </div>
          </div>

          {/* FIFA WC 2026 Core extensions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transit Hubs */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                🚆 Transportation Hubs
              </h3>
              <div className="space-y-3">
                {renderedHubs}
              </div>
            </div>

            {/* Navigation paths */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                🗺️ Stadium Navigation Paths
              </h3>
              <div className="space-y-3">
                {renderedPaths}
              </div>
            </div>

            {/* Zone Density */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                🔥 Crowd Density Heatmap
              </h3>
              <div className="space-y-3">
                {renderedDensity}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm mt-4"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* AI Intelligence Output */}
      {aiResponse && (
        <div
          aria-live="polite"
          className="space-y-4 border-t border-white/10 pt-4 mt-6"
          data-testid="crowd-ai-response"
        >
          <div className="flex items-center gap-3">
            <AlertLevelBadge level={aiResponse.alertLevel ?? "moderate"} />
            <span className="text-xs text-slate-500">AI-generated operational intelligence</span>
          </div>

          <div className="bg-white/5 rounded-lg p-4 space-y-3 border border-white/10">
            <h4 className="text-sm font-bold text-cyan-400">Situation Analysis</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {aiResponse.analysis ?? "No situation analysis available."}
            </p>
          </div>

          {aiResponse.transportationAdvisory && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-sm font-bold text-purple-400 mb-1">Transit Advisory</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {aiResponse.transportationAdvisory}
              </p>
            </div>
          )}

          {aiResponse.navigationGuidance && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-sm font-bold text-pink-400 mb-1">Navigation Redirection guidance</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {aiResponse.navigationGuidance}
              </p>
            </div>
          )}

          {/* Deployment Suggestions */}
          {aiResponse.deploymentSuggestions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                📋 Staff Deployment Recommendations
              </h3>
              <div className="space-y-2">
                {renderedSuggestions}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!crowdData && !loading && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-lg mb-1">📊 Operations data empty</p>
          <p className="text-sm">
            Click &quot;Analyze Gates & Hubs&quot; to fetch telemetry and compute
            AI routing recommendations.
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Main export wrapping CrowdManagement with ErrorBoundary protection.
 */
export default function CrowdManagement() {
  return (
    <ErrorBoundary moduleName="Crowd Management">
      <CrowdManagementInner />
    </ErrorBoundary>
  );
}
