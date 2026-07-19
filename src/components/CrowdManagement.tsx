/**
 * CrowdManagement Component
 *
 * Displays real-time gate utilization data and AI-generated
 * crowd management recommendations with staff deployment suggestions.
 */

"use client";

import React, { useState, useCallback } from "react";
import type {
  CrowdManagementRequest,
  CrowdManagementResponse,
  GateData,
  GenAIApiResponse,
} from "@/types/stadium";
import { generateCrowdData } from "@/lib/simulatedData";

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

/** Visual indicator for gate utilization level. */
function UtilizationBadge({ percent }: { percent: number }) {
  let colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  let label = "Normal";

  if (percent > 100) {
    colorClass = "bg-red-500/20 text-red-300 border-red-500/30";
    label = "Over Capacity";
  } else if (percent > 80) {
    colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    label = "High";
  } else if (percent > 60) {
    colorClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    label = "Moderate";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}
      role="status"
      aria-label={`Utilization: ${percent}% — ${label}`}
    >
      {percent}% — {label}
    </span>
  );
}

/** Renders a single gate data card. */
function GateCard({ gate }: { gate: GateData }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{gate.gateId}</h4>
        <span className="text-xs text-slate-400 uppercase tracking-wide">
          {gate.zone}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Wait Time</span>
          <span className="font-mono">{gate.currentWaitTime} min</span>
        </div>
        <div className="flex justify-between text-xs text-slate-300">
          <span>Capacity</span>
          <span className="font-mono">{gate.capacity}/min</span>
        </div>
        {/* Utilization progress bar */}
        <div
          className="w-full bg-slate-700 rounded-full h-1.5 mt-1"
          role="progressbar"
          aria-valuenow={gate.utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${gate.gateId} utilization`}
        >
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              gate.utilizationPercent > 100
                ? "bg-red-500"
                : gate.utilizationPercent > 80
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(gate.utilizationPercent, 100)}%` }}
          />
        </div>
        <UtilizationBadge percent={gate.utilizationPercent} />
      </div>
    </div>
  );
}

/** Renders alert level badge for the AI response. */
function AlertLevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    moderate: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    critical: "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full border ${
        styles[level] || styles.moderate
      }`}
      role="alert"
      data-testid="crowd-alert-badge"
    >
      ⚡ {level.toUpperCase()} ALERT
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CrowdManagement() {
  const [crowdData, setCrowdData] = useState<CrowdManagementRequest | null>(null);
  const [aiResponse, setAiResponse] = useState<CrowdManagementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Generate fresh simulated data and request AI analysis. */
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

  return (
    <section
      aria-labelledby="crowd-management-heading"
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg shadow-lg shadow-blue-500/20">
            👥
          </div>
          <div>
            <h2
              id="crowd-management-heading"
              className="text-xl font-bold text-white"
            >
              Crowd Management
            </h2>
            <p className="text-xs text-slate-400">
              Real-time gate analysis & staff deployment AI
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
            "🔍 Analyze Gates"
          )}
        </button>
      </div>

      {/* Gate Grid */}
      {crowdData && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Gate Status — {crowdData.gates.length} gates monitored
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Occupancy: {crowdData.totalOccupancy.toLocaleString()} /{" "}
              {crowdData.maxCapacity.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {crowdData.gates.map((gate) => (
              <GateCard key={gate.gateId} gate={gate} />
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* AI Response */}
      {aiResponse && (
        <div
          aria-live="polite"
          className="space-y-4 border-t border-white/10 pt-4"
          data-testid="crowd-ai-response"
        >
          <div className="flex items-center gap-3">
            <AlertLevelBadge level={aiResponse.alertLevel} />
            <span className="text-xs text-slate-500">AI-generated intelligence</span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed bg-white/5 rounded-lg p-4">
            {aiResponse.analysis}
          </p>

          {/* Deployment Suggestions */}
          {aiResponse.deploymentSuggestions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                📋 Deployment Recommendations
              </h3>
              <div className="space-y-2">
                {aiResponse.deploymentSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3"
                  >
                    <span
                      className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded uppercase ${
                        suggestion.priority === "urgent"
                          ? "bg-red-500/30 text-red-300"
                          : suggestion.priority === "high"
                          ? "bg-orange-500/30 text-orange-300"
                          : suggestion.priority === "medium"
                          ? "bg-yellow-500/30 text-yellow-300"
                          : "bg-slate-500/30 text-slate-300"
                      }`}
                    >
                      {suggestion.priority}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {suggestion.location}
                      </p>
                      <p className="text-xs text-slate-400">{suggestion.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!crowdData && !loading && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-lg mb-1">📊 No data loaded</p>
          <p className="text-sm">
            Click &quot;Analyze Gates&quot; to generate simulated gate data and get
            AI-powered crowd management insights.
          </p>
        </div>
      )}
    </section>
  );
}
