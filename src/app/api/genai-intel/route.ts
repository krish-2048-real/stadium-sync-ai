/**
 * GenAI Intelligence API Route — /api/genai-intel
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
} from "@/types/stadium";

/* ------------------------------------------------------------------ */
/*  Rate Limiter (Placeholder)                                         */
/* ------------------------------------------------------------------ */

/**
 * Simple in-memory rate limiter store tracking client IPs.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/** Rate limit window in milliseconds (1 minute). */
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Maximum requests allowed per IP per window. */
const RATE_LIMIT_MAX_REQUESTS = 20;

/**
 * Validates whether the incoming client IP has exceeded the request limits.
 *
 * @param clientIp - The IP address of the client request
 * @returns Object indicating if request is allowed and remaining request count
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
 * dynamic navigation path advice, and real-time zone crowd density heatmapping).
 *
 * @param data - The crowd management input payload
 * @returns Full prompt string for the Gemini API model
 */
function buildCrowdPrompt(data: CrowdManagementRequest): string {
  const gatesSummary = (data.gates ?? [])
    .map(
      (g) =>
        `${g.gateId} (${g.zone}): wait=${g.currentWaitTime}min, capacity=${g.capacity}/min, utilization=${g.utilizationPercent}%`
    )
    .join("\n");

  const hubsSummary = (data.transportationHubs ?? [])
    .map(
      (h) =>
        `- ${h.hubId} (${h.mode}): throughput=${h.currentThroughput}/min, max=${h.maxCapacity}/min, wait=${h.estimatedWaitMinutes}min, status=${h.status}`
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

**Monitored Entry/Exit Gates:**
${gatesSummary}

**Multi-modal Transportation Hubs (Trains, Buses, Parking, Rideshare):**
${hubsSummary}

**Dynamic Concourse & Stadium Navigation Paths:**
${pathsSummary}

**Real-Time Zone Crowd Density Heatmapping:**
${densitySummary}

Respond ONLY with a valid, clean JSON object matching the exact structure below (no markdown formatting, no code fences):
{
  "alertLevel": "low" | "moderate" | "high" | "critical",
  "analysis": "A comprehensive 2-3 sentence analysis of current ingress/egress gate wait times, stadium flow hotspots, and transit bottleneck points.",
  "deploymentSuggestions": [
    {
      "location": "Gate, Stand, Corridor, or Hub name",
      "action": "Clear operational direction (e.g. open secondary lanes, reallocate ushers, dispatch shuttle buses)",
      "priority": "low" | "medium" | "high" | "urgent"
    }
  ],
  "transportationAdvisory": "Actionable instructions for train arrivals, bus loops, or parking lot traffic redirections.",
  "navigationGuidance": "Real-time navigation redirection directives to display on stadium signage screens for routing fans away from dense spots."
}

Provide 3-5 concrete, actionable deployment suggestions addressing bottlenecks and prioritizing security and accessibility.`;
}

/**
 * Builds a Gemini prompt for the Translation module.
 *
 * @param data - The translation request payload
 * @returns Full prompt string for the Gemini API model
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
 * @param data - The sustainability request payload
 * @returns Full prompt string for the Gemini API model
 */
function buildSustainabilityPrompt(data: SustainabilityRequest): string {
  const gridsSummary = (data.grids ?? [])
    .map(
      (g) =>
        `${g.zone}: current=${g.currentConsumptionKW}kW, baseline=${g.baselineKW}kW, renewable=${g.renewablePercent}%, HVAC=${g.hvacStatus}, lighting=${g.lightingPercent}%`
    )
    .join("\n");

  return `You are an AI sustainability and smart-grid optimizer for the FIFA World Cup 2026 stadium complex.

Analyze the power grid metrics below and provide energy efficiency optimization tips.

**Weather Conditions:**
- Temperature: ${data.weatherConditions?.temperatureCelsius ?? 20}°C
- Humidity: ${data.weatherConditions?.humidity ?? 50}%
- Raining: ${data.weatherConditions?.isRaining ? "Yes" : "No"}

**Zone Grid Power Consumption:**
${gridsSummary}

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
  "carbonReductionKg": number
}

Provide 3-5 high-impact energy efficiency tips.`;
}

/* ------------------------------------------------------------------ */
/*  Route Handler                                                      */
/* ------------------------------------------------------------------ */

/**
 * Next.js API Route Handler for smart stadium operations analysis.
 *
 * @param request - NextRequest object
 * @returns NextResponse containing AI intel or validation error details
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    // --- Rate Limiting ---
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          module: "crowd-management" as const,
          error: "Rate limit exceeded. Please try again later.",
          timestamp,
        } satisfies GenAIApiResponse,
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    // --- Parse & Validate Body ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          module: "crowd-management",
          error: "Invalid JSON in request body",
          timestamp,
        } satisfies GenAIApiResponse,
        { status: 400 }
      );
    }

    const validation = validatePayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          module: (body as GenAIRequestPayload)?.module || "crowd-management",
          error: validation.error,
          timestamp,
        } satisfies GenAIApiResponse,
        { status: 400 }
      );
    }

    const payload = body as GenAIRequestPayload;

    // --- Check API Key ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[StadiumSync] GEMINI_API_KEY is not set in environment");
      return NextResponse.json(
        {
          success: false,
          module: payload.module,
          error: "AI service is not configured. Please contact the administrator.",
          timestamp,
        } satisfies GenAIApiResponse,
        { status: 503 }
      );
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
        } satisfies GenAIApiResponse,
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
      return NextResponse.json(
        {
          success: false,
          module: payload.module,
          error: "AI returned an unparseable response. Please try again.",
          timestamp,
        } satisfies GenAIApiResponse,
        { status: 502 }
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
      } satisfies GenAIApiResponse,
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
    return NextResponse.json(
      {
        success: false,
        module: "crowd-management",
        error: "An internal server error occurred.",
        timestamp,
      } satisfies GenAIApiResponse,
      { status: 500 }
    );
  }
}
