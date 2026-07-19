/**
 * GenAI Intelligence API Route — /api/genai-intel
 *
 * Server-side Next.js route handler that:
 * 1. Validates incoming JSON payloads via strict schema validation
 * 2. Applies rate-limiting (placeholder — production should use Redis/upstash)
 * 3. Calls the Google Gemini API with module-specific prompts
 * 4. Returns structured JSON responses
 *
 * Security: The GEMINI_API_KEY is accessed ONLY via process.env on the server.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validatePayload } from "@/lib/validation";
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
 * Simple in-memory rate limiter.
 * In production, replace with Redis-backed solution (e.g., @upstash/ratelimit).
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per window

function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);

  if (!entry || now > entry.resetTime) {
    // New window
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

/** Builds a Gemini prompt for the Crowd Management module. */
function buildCrowdPrompt(data: CrowdManagementRequest): string {
  const gatesSummary = data.gates
    .map(
      (g) =>
        `${g.gateId} (${g.zone}): wait=${g.currentWaitTime}min, capacity=${g.capacity}, utilization=${g.utilizationPercent}%`
    )
    .join("\n");

  return `You are an AI crowd management expert for the FIFA World Cup 2026 stadium operations.

Analyze the following real-time gate data and provide operational intelligence.

**Stadium Status:**
- Timestamp: ${data.timestamp}
- Total Occupancy: ${data.totalOccupancy.toLocaleString()} / ${data.maxCapacity.toLocaleString()} (${Math.round((data.totalOccupancy / data.maxCapacity) * 100)}%)

**Gate Data:**
${gatesSummary}

Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{
  "alertLevel": "low" | "moderate" | "high" | "critical",
  "analysis": "A 2-3 sentence summary of the current crowd situation",
  "deploymentSuggestions": [
    {
      "location": "Gate or Zone name",
      "action": "Specific staff action to take",
      "priority": "low" | "medium" | "high" | "urgent"
    }
  ]
}

Provide 2-4 actionable deployment suggestions based on the data.`;
}

/** Builds a Gemini prompt for the Translation module. */
function buildTranslationPrompt(data: TranslationRequest): string {
  const langList = data.targetLanguages.join(", ");
  const contextNote = data.context
    ? `This is a ${data.context} announcement — use appropriate tone and urgency.`
    : "This is a general stadium announcement.";

  return `You are a professional multilingual translator for FIFA World Cup 2026 stadium PA systems.

Translate the following announcement from ${data.sourceLanguage} into these languages: ${langList}

${contextNote}

**Original Text:** "${data.sourceText}"

Respond ONLY with a valid JSON object (no markdown, no code fences):
{
  "originalText": "${data.sourceText}",
  "translations": [
    {
      "language": "language code",
      "languageName": "Language Name in English",
      "text": "Translated text"
    }
  ]
}

Ensure translations are culturally appropriate and suitable for public address systems.`;
}

/** Builds a Gemini prompt for the Sustainability module. */
function buildSustainabilityPrompt(data: SustainabilityRequest): string {
  const gridsSummary = data.grids
    .map(
      (g) =>
        `${g.zone}: ${g.currentConsumptionKW}kW (baseline: ${g.baselineKW}kW), renewable: ${g.renewablePercent}%, HVAC: ${g.hvacStatus}, lighting: ${g.lightingPercent}%`
    )
    .join("\n");

  return `You are an AI sustainability advisor for FIFA World Cup 2026 stadium operations.

Analyze the following energy data and provide efficiency recommendations.

**Weather Conditions:**
- Temperature: ${data.weatherConditions.temperatureCelsius}°C
- Humidity: ${data.weatherConditions.humidity}%
- Raining: ${data.weatherConditions.isRaining ? "Yes" : "No"}

**Energy Grid Data:**
${gridsSummary}

Respond ONLY with a valid JSON object (no markdown, no code fences):
{
  "efficiencyScore": 0-100,
  "estimatedSavingsKWH": number,
  "tips": [
    {
      "title": "Short tip title",
      "description": "Detailed recommendation",
      "impactLevel": "low" | "medium" | "high",
      "targetZone": "Zone name"
    }
  ],
  "carbonReductionKg": number
}

Provide 3-5 actionable energy efficiency tips.`;
}

/* ------------------------------------------------------------------ */
/*  Route Handler                                                      */
/* ------------------------------------------------------------------ */

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

    // --- Call Gemini API ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // --- Parse AI Response ---
    // Strip markdown code fences if Gemini wraps the JSON
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

    // --- Return Success ---
    return NextResponse.json(
      {
        success: true,
        module: payload.module,
        data: parsedData,
        timestamp,
      } satisfies GenAIApiResponse,
      {
        status: 200,
        headers: {
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
