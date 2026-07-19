/**
 * @file MultilingualAssistant.tsx
 * @description MultilingualAssistant Component
 *
 * Allows operators to select a PA announcement template (or write custom text),
 * pick target languages, and get AI-powered translations via Gemini.
 *
 * Optimised with React.useMemo, React.useCallback, and strict null/undefined safety.
 * Implements semantic HTML and exhaustive JSDoc typing.
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import type {
  TranslationRequest,
  TranslationResponse,
  GenAIApiResponse,
} from "@/types/stadium";
import { SAMPLE_ANNOUNCEMENTS, TARGET_LANGUAGES } from "@/lib/simulatedData";
import ErrorBoundary from "./ErrorBoundary";

/* ------------------------------------------------------------------ */
/*  Sub-Components (Memoised for Max Efficiency)                      */
/* ------------------------------------------------------------------ */

/**
 * Renders a single translated text item.
 * @param {Object} props - Component properties
 * @param {string} props.language - ISO language code
 * @param {string} props.languageName - Human readable language name
 * @param {string} props.text - The translated announcement string
 * @returns {React.ReactElement} Translation card UI
 */
const TranslationCard = React.memo(function TranslationCard({
  language,
  languageName,
  text,
}: {
  language: string;
  languageName: string;
  text: string;
}) {
  const lang = language ?? "unknown";
  const name = languageName ?? "Unknown Language";
  const txt = text ?? "";

  return (
    <article className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-colors">
      <header className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-bold rounded uppercase">
          {lang}
        </span>
        <h4 className="text-sm font-medium text-slate-400">{name}</h4>
      </header>
      <p className="text-sm text-white leading-relaxed">{txt}</p>
    </article>
  );
});

/**
 * Renders language pick options.
 * @param {Object} props - Component properties
 * @param {string} props.code - ISO language code
 * @param {string} props.name - Human readable language name
 * @param {boolean} props.isSelected - Whether the language is currently selected
 * @param {(code: string) => void} props.onToggle - Toggle handler
 * @returns {React.ReactElement} Language option label UI
 */
const LanguageOption = React.memo(function LanguageOption({
  code,
  name,
  isSelected,
  onToggle,
}: {
  code: string;
  name: string;
  isSelected: boolean;
  onToggle: (code: string) => void;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-purple-500/30 border-purple-500/50 text-purple-300"
          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(code)}
        className="sr-only"
        aria-label={`Translate to ${name}`}
      />
      {name}
    </label>
  );
});

/* ------------------------------------------------------------------ */
/*  Inner Multilingual Assistant Component                             */
/* ------------------------------------------------------------------ */

/**
 * Core UI implementation for Multilingual PA Assistant.
 * @returns {React.ReactElement} Main MultilingualAssistant section
 */
function MultilingualAssistantInner() {
  const [sourceText, setSourceText] = useState(SAMPLE_ANNOUNCEMENTS[0] ?? "");
  const [context, setContext] = useState<TranslationRequest["context"]>("general");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["es", "fr", "ar"]);
  const [aiResponse, setAiResponse] = useState<TranslationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Toggles selecting/deselecting target language option.
   */
  const toggleLanguage = useCallback((code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  }, []);

  /**
   * Dispatches the API request to translate text across specified target languages.
   */
  const translateAnnouncement = useCallback(async () => {
    if (!sourceText.trim() || selectedLanguages.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const translationData: TranslationRequest = {
        sourceText: sourceText.trim(),
        sourceLanguage: "en",
        targetLanguages: selectedLanguages,
        context,
      };

      const response = await fetch("/api/genai-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "translation",
          translationData,
        }),
      });

      const result: GenAIApiResponse<TranslationResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Translation failed");
      }

      setAiResponse(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [sourceText, selectedLanguages, context]);

  // Memoised presets to avoid creating array instances on every render
  const renderedPresets = useMemo(() => {
    return SAMPLE_ANNOUNCEMENTS.map((text, idx) => (
      <option key={idx} value={text} className="bg-slate-800">
        {text.slice(0, 70)}…
      </option>
    ));
  }, []);

  // Memoised target languages checkbox list
  const renderedLanguageCheckboxes = useMemo(() => {
    return TARGET_LANGUAGES.map((lang) => (
      <LanguageOption
        key={lang.code}
        code={lang.code}
        name={lang.name}
        isSelected={selectedLanguages.includes(lang.code)}
        onToggle={toggleLanguage}
      />
    ));
  }, [selectedLanguages, toggleLanguage]);

  // Memoised translations display
  const renderedTranslations = useMemo(() => {
    return (aiResponse?.translations ?? []).map((t, idx) => (
      <TranslationCard
        key={idx}
        language={t.language}
        languageName={t.languageName}
        text={t.text}
      />
    ));
  }, [aiResponse?.translations]);

  return (
    <section
      aria-labelledby="translation-heading"
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl"
    >
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg shadow-lg shadow-purple-500/20">
          🌐
        </div>
        <div>
          <h2 id="translation-heading" className="text-xl font-bold text-white">
            Multilingual PA Assistant
          </h2>
          <p className="text-xs text-slate-400">
            AI-powered announcement translation for global fans (FIFA 2026)
          </p>
        </div>
      </header>

      {/* Announcement Input */}
      <div className="space-y-4 mb-6">
        {/* Presets */}
        <div>
          <label
            htmlFor="announcement-preset"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Quick Templates
          </label>
          <select
            id="announcement-preset"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            {renderedPresets}
          </select>
        </div>

        {/* Custom Text */}
        <div>
          <label
            htmlFor="announcement-text"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Announcement Text
          </label>
          <textarea
            id="announcement-text"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="Type your custom announcement…"
            aria-describedby="char-count"
          />
          <p id="char-count" className="text-xs text-slate-500 mt-1">
            {(sourceText ?? "").length}/2000 characters
          </p>
        </div>

        {/* Context Selector */}
        <div>
          <label
            htmlFor="announcement-context"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Context
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Announcement context">
            {(["general", "emergency", "wayfinding", "event"] as const).map((ctx) => (
              <button
                key={ctx}
                role="radio"
                aria-checked={context === ctx}
                onClick={() => setContext(ctx)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  context === ctx
                    ? "bg-purple-500/30 border-purple-500/50 text-purple-300"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                {ctx === "emergency" ? "🚨 " : ctx === "wayfinding" ? "🗺️ " : ctx === "event" ? "⚽ " : "📢 "}
                {ctx.charAt(0).toUpperCase() + ctx.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Target Languages */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-300 mb-1.5">
            Target Languages
          </legend>
          <div className="flex flex-wrap gap-2">
            {renderedLanguageCheckboxes}
          </div>
        </fieldset>
      </div>

      {/* Translate Button */}
      <button
        onClick={translateAnnouncement}
        disabled={loading || !sourceText.trim() || selectedLanguages.length === 0}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 mb-6"
        aria-label="Translate announcement to selected languages"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
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
            Translating…
          </span>
        ) : (
          "🌍 Translate Announcement"
        )}
      </button>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm mb-4"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Translations */}
      {aiResponse && (
        <section aria-live="polite" className="space-y-3 border-t border-white/10 pt-4">
          <header>
            <h3 className="text-sm font-semibold text-slate-300">
              📝 Translations ({(aiResponse.translations ?? []).length} languages)
            </h3>
          </header>
          <div className="space-y-2">
            {renderedTranslations}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!aiResponse && !loading && !error && (
        <div className="text-center py-6 text-slate-500 border-t border-white/10">
          <p className="text-sm">
            Select a template or write custom text, choose target languages, then
            click translate.
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Main export wrapping MultilingualAssistant with ErrorBoundary protection.
 * @returns {React.ReactElement} The wrapped MultilingualAssistant component
 */
export default function MultilingualAssistant(): React.ReactElement {
  return (
    <ErrorBoundary moduleName="Multilingual PA Assistant">
      <MultilingualAssistantInner />
    </ErrorBoundary>
  );
}
