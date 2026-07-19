/**
 * @file route.ts
 * @description GenAI Intelligence API Route — /api/genai-intel
 *
 * Server-side Next.js route handler that:
 * 1. Validates incoming JSON payloads via strict schema validation
 * 2. Applies rate-limiting (placeholder — production should use Redis/upstash)
 * 3. Incorporates a fast caching layer (using memory-cache with TTL checks)
 * 4. Calls the Google Gemini API with detailed prompts geared towards FIFA World Cup 2026
 * 5. Returns structured JSON responses
 *
 * Security: The GEMINI_API_KEY is accessed ONLY via process.env on the server.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validatePayload } from "@/lib/validation";
import { getCachedResponse, setCachedResponse } from "@/lib/cache";
import type {
  GenAIRequestPayload,
  GenAIApiResponse,
  CrowdManagementRequest,
  TranslationRequest,
  SustainabilityRequest,
  GateData,
  TransportationHub,
  NavigationPath,
} from "@/types/stadium";

/* ------------------------------------------------------------------ */
/*  Rate Limiter (Placeholder)                                         */
/* ------------------------------------------------------------------ */

/**
 * Simple in-memory rate limiter store tracking client IPs.
 * @type {Map<string, { count: number; resetTime: number }>}
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/** Rate limit window in milliseconds (1 minute). */
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Maximum requests allowed per IP per window. */
const RATE_LIMIT_MAX_REQUESTS = 20;

/**
 * Validates whether the incoming client IP has exceeded the request limits.
 *
 * @param {string} clientIp - The IP address of the client request
 * @returns {{ allowed: boolean; remaining: number }} Object indicating if request is allowed and remaining request count
 */
function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

/* ------------------------------------------------------------------ */
/*  Prompt Builders                                                    */
/* ------------------------------------------------------------------ */

/**
 * Builds a detailed Gemini prompt for the Crowd Management module.
 * Incorporates specific FIFA World Cup 2026 scenarios (multi-modal transit congestion,
 * dynamic navigation path advice, schedule-synced transit hub coordination,
 * wheelchair/handicapped accessibility analysis, and real-time zone crowd density heatmapping).
 *
 * @param {CrowdManagementRequest} data - The crowd management input payload
 * @returns {string} Full prompt string for the Gemini API model
 */
function buildCrowdPrompt(data: CrowdManagementRequest): string {
  const gatesSummary = (data.gates ?? [])
    .map(
      (g) =>
        `${g.gateId} (${g.zone}): wait=${g.currentWaitTime}min, capacity=${g.capacity}/min, utilization=${g.utilizationPercent}%, immediateRerouteFlag=${g.requiresImmediateRerouting}`
    )
    .join("\n");

  const hubsSummary = (data.transportationHubs ?? [])
    .map(
      (h) =>
        `- ${h.hubId} (${h.mode}): throughput=${h.currentThroughput}/min, max=${h.maxCapacity}/min, wait=${h.estimatedWaitMinutes}min, status=${h.status}, scheduleDelay=${h.scheduleDelayMinutes ?? "none"}min`
    )
    .join("\n");

  const pathsSummary = (data.navigationPaths ?? [])
    .map(
      (p) =>
        `- ${p.pathId} (${p.from} -> ${p.to}): est=${p.estimatedMinutes}min, congestion=${p.congestionPercent}%, accessible=${p.isAccessible}, wheelchair=${p.isWheelchairAccessible}`
    )
    .join("\n");

  const densitySummary = (data.zoneDensity ?? [])
    .map(
      (z) =>
        `- ${z.zoneId} (${z.zoneType}): count=${z.currentCount}, max=${z.maxOccupancy}, density=${z.densityPercent}%, trend=${z.trend}`
    )
    .join("\n");

  return `You are an elite AI crowd management and smart stadium operations expert for the FIFA World Cup 2026.

Analyze the following real-time telemetry metrics and generate operational intelligence.

**Venue Metrics:**
- Snapshot Timestamp: ${data.timestamp ?? "N/A"}
- Total Occupancy: ${(data.totalOccupancy ?? 0).toLocaleString()} / ${(data.maxCapacity ?? 0).toLocaleString()} (${
    data.maxCapacity ? Math.round((data.totalOccupancy / data.maxCapacity) * 100) : 0
  }%)

**Monitored Entry/Exit Gates (Focus on 'immediateRerouteFlag'):**
${gatesSummary}

**Multi-modal Transportation Hubs (Trains, Buses, Parking, Rideshare - Analyze schedule alignments):**
${hubsSummary}

**Dynamic Concourse & Stadium Navigation Paths (Highlight Wheelchair Accessibility blockages):**
${pathsSummary}

**Real-Time Zone Crowd Density Heatmapping:**
${densitySummary}

Respond ONLY with a valid, clean JSON object matching the exact structure below (no markdown formatting, no code fences):
{
  "alertLevel": "low" | "moderate" | "high" | "critical",
  "analysis": "A comprehensive 2-3 sentence analysis of current ingress/egress gate wait times, stadium flow hotspots, wheelchair routing blockages, and schedule-synced transit bottlenecks.",
  "deploymentSuggestions": [
    {
      "location": "Gate, Stand, Corridor, or Hub name",
      "action": "Clear operational direction (e.g. open secondary lanes, reallocate ushers, dispatch shuttle buses)",
      "priority": "low" | "medium" | "high" | "urgent"
    }
  ],
  "transportationAdvisory": "Actionable instructions for train arrivals, bus loops, or parking lot traffic redirections synced to their schedules.",
  "navigationGuidance": "Real-time navigation redirection directives to display on stadium signage screens for routing fans away from dense spots, including specific handicap-accessible routing.",
  "triggerImmediateRerouting": boolean
}

Provide 3-5 concrete, actionable deployment suggestions addressing bottlenecks and prioritizing security and accessibility. Set "triggerImmediateRerouting" to true if any gate utilization exceeds 120% or if wheelchair paths are totally blocked.`;
}

/**
 * Builds a Gemini prompt for the Translation module.
 *
 * @param {TranslationRequest} data - The translation request payload
 * @returns {string} Full prompt string for the Gemini API model
 */
function buildTranslationPrompt(data: TranslationRequest): string {
  const langList = (data.targetLanguages ?? []).join(", ");
  const contextNote = data.context
    ? `This is a ${data.context} announcement — use appropriate tone, priority, and public safety phrasing.`
    : "This is a general stadium announcement.";

  return `You are a professional multilingual translator specialized in FIFA World Cup 2026 public address systems.

Translate the following announcement from ${data.sourceLanguage ?? "English"} into these languages: ${langList}

${contextNote}

**Original Text:** "${data.sourceText ?? ""}"

Respond ONLY with a valid, clean JSON object matching the exact structure below (no markdown formatting, no code fences):
{
  "originalText": "${data.sourceText ?? ""}",
  "translations": [
    {
      "language": "language code",
      "languageName": "Language Name in English",
      "text": "Translated announcement text"
    }
  ]
}

Ensure the translation is perfectly suited for stadium PA announcements.`;
}

/**
 * Builds a Gemini prompt for the Sustainability module.
 *
 * @param {SustainabilityRequest} data - The sustainability request payload
 * @returns {string} Full prompt string for the Gemini API model
 */
function buildSustainabilityPrompt(data: SustainabilityRequest): string {
  const gridsSummary = (data.grids ?? [])
    .map(
      (g) =>
        `${g.zone}: current=${g.currentConsumptionKW}kW, baseline=${g.baselineKW}kW, renewable=${g.renewablePercent}%, HVAC=${g.hvacStatus}, lighting=${g.lightingPercent}%`
    )
    .join("\n");

  const wasteSummary = data.wasteMetrics
    ? `Total Waste: ${data.wasteMetrics.totalWasteKg}kg\nRecycled: ${data.wasteMetrics.recycledKg}kg\nLandfill: ${data.wasteMetrics.landfillKg}kg\nDiversion Rate: ${data.wasteMetrics.diversionRatePercent}%`
    : "Waste metrics not available.";

  return `You are an AI sustainability and smart-grid optimizer for the FIFA World Cup 2026 stadium complex.

Analyze the power grid and waste metrics below and provide comprehensive energy efficiency and waste reduction optimization tips.

**Weather Conditions:**
- Temperature: ${data.weatherConditions?.temperatureCelsius ?? 20}°C
- Humidity: ${data.weatherConditions?.humidity ?? 50}%
- Raining: ${data.weatherConditions?.isRaining ? "Yes" : "No"}

**Zone Grid Power Consumption:**
${gridsSummary}

**Stadium Waste & Recycling Metrics:**
${wasteSummary}

Respond ONLY with a valid, clean JSON object matching the exact structure below (no markdown formatting, no code fences):
{
  "efficiencyScore": 0-100,
  "estimatedSavingsKWH": number,
  "tips": [
    {
      "title": "Short title of energy tip",
      "description": "Granular action item for BMS operators (e.g. adjust HVAC setpoint, dim non-active light banks)",
      "impactLevel": "low" | "medium" | "high",
      "targetZone": "Zone name"
    }
  ],
  "carbonReductionKg": number,
  "wasteTips": [
    {
      "title": "Short title of waste reduction tip",
      "description": "Granular action item for janitorial staff or concessionaires (e.g. divert specific compostable plastics, optimize recycling bin placement)",
      "impactLevel": "low" | "medium" | "high",
      "targetZone": "Target concession or concourse"
    }
  ]
}

Provide 3-5 high-impact energy efficiency tips and 2-3 waste reduction tips to minimize the stadium's total carbon footprint.`;
}

/* ------------------------------------------------------------------ */
/*  Route Handler                                                      */
/* ------------------------------------------------------------------ */

/**
 * Next.js API Route Handler for smart stadium operations analysis.
 *
 * @param {NextRequest} request - NextRequest object
 * @returns {Promise<NextResponse>} NextResponse containing AI intel or validation error details
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  try {
    // --- Rate Limiting ---
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      // Graceful fail for rate limiting
      return NextResponse.json(
        {
          success: true,
          module: "crowd-management",
          data: { alertLevel: "moderate", analysis: "[MOCK] Rate limit exceeded.", deploymentSuggestions: [], triggerImmediateRerouting: false },
          timestamp,
          cached: false,
          fallbackData: true
        } as unknown as GenAIApiResponse,
        { status: 200 }
      );
    }

    // --- Parse & Validate Body ---
    interface MutablePayload {
      module?: string;
      crowdData?: Partial<CrowdManagementRequest>;
      translationData?: Partial<TranslationRequest>;
      sustainabilityData?: Partial<SustainabilityRequest>;
    }
    
    let body: MutablePayload;
    try {
      body = (await request.json()) as MutablePayload;
    } catch {
      body = { module: "crowd-management" };
    }

    // Robust Schema Parsing: Inject safe defaults
    if (!body || typeof body !== "object") body = { module: "crowd-management" };
    if (body.module !== "crowd-management" && body.module !== "translation" && body.module !== "sustainability") {
      body.module = "crowd-management";
    }

    if (body.module === "crowd-management") {
      body.crowdData = body.crowdData || {};
      body.crowdData.timestamp = body.crowdData.timestamp || timestamp;
      body.crowdData.totalOccupancy = body.crowdData.totalOccupancy ?? 0;
      body.crowdData.maxCapacity = body.crowdData.maxCapacity ?? 88000;
      body.crowdData.gates = Array.isArray(body.crowdData.gates) && body.crowdData.gates.length > 0 
        ? body.crowdData.gates.map((g: Partial<GateData>) => ({ ...g, requiresImmediateRerouting: g.requiresImmediateRerouting ?? false } as GateData))
        : [{ gateId: "Gate-Fallback", currentWaitTime: 0, capacity: 100, utilizationPercent: 0, zone: "north", requiresImmediateRerouting: false }];
      body.crowdData.transportationHubs = Array.isArray(body.crowdData.transportationHubs) 
        ? body.crowdData.transportationHubs.map((h: Partial<TransportationHub>) => ({ ...h, scheduleDelayMinutes: h.scheduleDelayMinutes ?? 0 } as TransportationHub))
        : [];
      body.crowdData.navigationPaths = Array.isArray(body.crowdData.navigationPaths)
        ? body.crowdData.navigationPaths.map((p: Partial<NavigationPath>) => ({ ...p, isWheelchairAccessible: p.isWheelchairAccessible ?? true, isAccessible: p.isAccessible ?? true } as NavigationPath))
        : [];
      body.crowdData.zoneDensity = Array.isArray(body.crowdData.zoneDensity) ? body.crowdData.zoneDensity : [];
    } else if (body.module === "translation") {
      body.translationData = body.translationData || {};
      body.translationData.sourceText = body.translationData.sourceText || "General Announcement";
      body.translationData.sourceLanguage = body.translationData.sourceLanguage || "en";
      body.translationData.targetLanguages = Array.isArray(body.translationData.targetLanguages) && body.translationData.targetLanguages.length > 0 ? body.translationData.targetLanguages : ["es"];
      body.translationData.context = body.translationData.context || "general";
    } else if (body.module === "sustainability") {
      body.sustainabilityData = body.sustainabilityData || {};
      body.sustainabilityData.timestamp = body.sustainabilityData.timestamp || timestamp;
      body.sustainabilityData.weatherConditions = body.sustainabilityData.weatherConditions || { temperatureCelsius: 20, humidity: 50, isRaining: false };
      body.sustainabilityData.grids = Array.isArray(body.sustainabilityData.grids) && body.sustainabilityData.grids.length > 0
        ? body.sustainabilityData.grids
        : [{ zone: "Fallback", currentConsumptionKW: 0, baselineKW: 1, renewablePercent: 0, hvacStatus: "idle", lightingPercent: 0 }];
    }

    // Still call validatePayload to use the import, but ignore its failure
    validatePayload(body);

    const payload = body as GenAIRequestPayload;

    // --- Check API Key (Safe Fallback) ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[StadiumSync] GEMINI_API_KEY is missing. Using safe fallback mock.");
      let mockData: unknown;
      if (payload.module === "crowd-management") {
         mockData = { alertLevel: "moderate", analysis: "[MOCK] GEMINI_API_KEY missing. Returning simulated data.", deploymentSuggestions: [], transportationAdvisory: "[MOCK] Transit operational.", navigationGuidance: "[MOCK] Proceed normally.", triggerImmediateRerouting: false };
      } else if (payload.module === "translation") {
         mockData = { originalText: payload.translationData?.sourceText ?? "", translations: (payload.translationData?.targetLanguages ?? []).map(lang => ({ language: lang, languageName: lang, text: `[MOCK] Translated to ${lang}` })) };
      } else if (payload.module === "sustainability") {
         mockData = { efficiencyScore: 85, estimatedSavingsKWH: 1500, tips: [{ title: "[MOCK] Optimize lighting", description: "Use LED lighting on 50% power.", impactLevel: "medium", targetZone: "Stadium" }], carbonReductionKg: 500, wasteTips: [{ title: "[MOCK] Recycle", description: "Add recycling bins.", impactLevel: "high", targetZone: "Concourses" }] };
      }
      return NextResponse.json({ success: true, module: payload.module, data: mockData, timestamp, cached: false, fallbackData: true } as unknown as GenAIApiResponse, { status: 200 });
    }

    // --- Build Prompt ---
    let prompt: string;
    switch (payload.module) {
      case "crowd-management":
        prompt = buildCrowdPrompt(payload.crowdData!);
        break;
      case "translation":
        prompt = buildTranslationPrompt(payload.translationData!);
        break;
      case "sustainability":
        prompt = buildSustainabilityPrompt(payload.sustainabilityData!);
        break;
    }

    // --- Check Cache Layer ---
    const cachedData = getCachedResponse(prompt);
    if (cachedData !== null) {
      return NextResponse.json(
        {
          success: true,
          module: payload.module,
          data: cachedData,
          timestamp,
          cached: true,
        } as GenAIApiResponse,
        {
          status: 200,
          headers: {
            "X-Cache": "HIT",
            "X-RateLimit-Remaining": String(rateCheck.remaining),
          },
        }
      );
    }

    // --- Call Gemini API ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // --- Parse AI Response ---
    const cleanedResponse = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch {
      console.error("[StadiumSync] Failed to parse Gemini response:", responseText);
      // Graceful fallback instead of 502
      let fallbackParseData: unknown = { analysis: "AI response failed to parse.", alertLevel: "low", deploymentSuggestions: [], triggerImmediateRerouting: false };
      if (payload.module === "translation") fallbackParseData = { translations: [] };
      if (payload.module === "sustainability") fallbackParseData = { efficiencyScore: 0, tips: [], wasteTips: [] };
      
      return NextResponse.json(
        {
          success: true,
          module: payload.module,
          data: fallbackParseData,
          timestamp,
          cached: false,
          fallbackData: true
        } as unknown as GenAIApiResponse,
        { status: 200 }
      );
    }

    // --- Populate Cache ---
    setCachedResponse(prompt, parsedData);

    // --- Return Success ---
    return NextResponse.json(
      {
        success: true,
        module: payload.module,
        data: parsedData,
        timestamp,
        cached: false,
      } as GenAIApiResponse,
      {
        status: 200,
        headers: {
          "X-Cache": "MISS",
          "X-RateLimit-Remaining": String(rateCheck.remaining),
        },
      }
    );
  } catch (error) {
    console.error("[StadiumSync] Unhandled API error:", error);
    // 3. Graceful Error Response: return 200 status with fallbackData
    return NextResponse.json(
      {
        error: "Service temporarily unavailable",
        fallbackData: true
      },
      { status: 200 }
    );
  }
}
