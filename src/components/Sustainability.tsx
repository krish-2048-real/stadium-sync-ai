/**
 * Sustainability Component
 *
 * Displays simulated energy grid data and AI-generated
 * sustainability tips with efficiency scores and carbon reduction estimates.
 */

"use client";

import React, { useState, useCallback } from "react";
import type {
  SustainabilityRequest,
  SustainabilityResponse,
  EnergyGridData,
  GenAIApiResponse,
} from "@/types/stadium";
import { generateSustainabilityData } from "@/lib/simulatedData";

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

/** Renders a single energy grid zone card. */
function GridCard({ grid }: { grid: EnergyGridData }) {
  const isOverBaseline = grid.currentConsumptionKW > grid.baselineKW;
  const ratio = Math.round((grid.currentConsumptionKW / grid.baselineKW) * 100);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">{grid.zone}</h4>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            grid.hvacStatus === "eco-mode"
              ? "bg-emerald-500/20 text-emerald-300"
              : grid.hvacStatus === "idle"
              ? "bg-slate-500/20 text-slate-300"
              : "bg-amber-500/20 text-amber-300"
          }`}
        >
          HVAC: {grid.hvacStatus}
        </span>
      </div>

      <div className="space-y-2 text-xs text-slate-300">
        <div className="flex justify-between">
          <span>Consumption</span>
          <span className={`font-mono ${isOverBaseline ? "text-red-400" : "text-emerald-400"}`}>
            {grid.currentConsumptionKW} kW
          </span>
        </div>
        <div className="flex justify-between">
          <span>Baseline</span>
          <span className="font-mono">{grid.baselineKW} kW</span>
        </div>
        <div className="flex justify-between">
          <span>vs Baseline</span>
          <span className={`font-mono font-bold ${isOverBaseline ? "text-red-400" : "text-emerald-400"}`}>
            {ratio}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Renewable</span>
          <span className="font-mono text-green-400">{grid.renewablePercent}%</span>
        </div>
        <div className="flex justify-between">
          <span>Lighting</span>
          <span className="font-mono">{grid.lightingPercent}%</span>
        </div>

        {/* Renewable energy bar */}
        <div
          className="w-full bg-slate-700 rounded-full h-1.5 mt-1"
          role="progressbar"
          aria-valuenow={grid.renewablePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${grid.zone} renewable energy`}
        >
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${grid.renewablePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Circular efficiency score display. */
function EfficiencyGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75
      ? "text-emerald-400"
      : score >= 50
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="flex flex-col items-center">
      <svg
        className="w-28 h-28"
        viewBox="0 0 100 100"
        aria-label={`Efficiency score: ${score}%`}
        role="img"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-700"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="46"
          textAnchor="middle"
          className={`${color} text-xl font-bold`}
          fill="currentColor"
          fontSize="20"
        >
          {score}
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          className="text-slate-400"
          fill="currentColor"
          fontSize="8"
        >
          EFFICIENCY
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Sustainability() {
  const [energyData, setEnergyData] = useState<SustainabilityRequest | null>(null);
  const [aiResponse, setAiResponse] = useState<SustainabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Generate fresh energy data and request AI analysis. */
  const analyzeEnergy = useCallback(async () => {
    setLoading(true);
    setError(null);

    const data = generateSustainabilityData();
    setEnergyData(data);

    try {
      const response = await fetch("/api/genai-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "sustainability",
          sustainabilityData: data,
        }),
      });

      const result: GenAIApiResponse<SustainabilityResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get sustainability analysis");
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
      aria-labelledby="sustainability-heading"
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-lg shadow-lg shadow-green-500/20">
            🌱
          </div>
          <div>
            <h2
              id="sustainability-heading"
              className="text-xl font-bold text-white"
            >
              Sustainability Monitor
            </h2>
            <p className="text-xs text-slate-400">
              Energy efficiency analysis & carbon reduction AI
            </p>
          </div>
        </div>
        <button
          onClick={analyzeEnergy}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Analyze stadium energy efficiency with AI"
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
            "⚡ Analyze Energy"
          )}
        </button>
      </div>

      {/* Weather Conditions */}
      {energyData && (
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-3 mb-4 text-xs text-slate-300">
          <span>🌡️ {energyData.weatherConditions.temperatureCelsius}°C</span>
          <span>💧 {energyData.weatherConditions.humidity}% humidity</span>
          <span>{energyData.weatherConditions.isRaining ? "🌧️ Raining" : "☀️ Clear"}</span>
        </div>
      )}

      {/* Energy Grid Cards */}
      {energyData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {energyData.grids.map((grid) => (
            <GridCard key={grid.zone} grid={grid} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm mb-4"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* AI Response */}
      {aiResponse && (
        <div
          aria-live="polite"
          className="space-y-4 border-t border-white/10 pt-4"
        >
          {/* Headline Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex justify-center">
              <EfficiencyGauge score={aiResponse.efficiencyScore} />
            </div>
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-4">
              <span className="text-2xl font-bold text-emerald-400">
                {aiResponse.estimatedSavingsKWH}
              </span>
              <span className="text-xs text-slate-400">kWh Savings</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-4">
              <span className="text-2xl font-bold text-green-400">
                {aiResponse.carbonReductionKg}
              </span>
              <span className="text-xs text-slate-400">kg CO₂ Reduced</span>
            </div>
          </div>

          {/* Tips */}
          {aiResponse.tips?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                💡 Energy Efficiency Tips
              </h3>
              <div className="space-y-2">
                {aiResponse.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-white">
                        {tip.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{tip.targetZone}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                            tip.impactLevel === "high"
                              ? "bg-emerald-500/30 text-emerald-300"
                              : tip.impactLevel === "medium"
                              ? "bg-yellow-500/30 text-yellow-300"
                              : "bg-slate-500/30 text-slate-300"
                          }`}
                        >
                          {tip.impactLevel}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{tip.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!energyData && !loading && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-lg mb-1">🔋 No data loaded</p>
          <p className="text-sm">
            Click &quot;Analyze Energy&quot; to generate simulated power grid data and
            get AI-powered sustainability insights.
          </p>
        </div>
      )}
    </section>
  );
}
