/**
 * Input Validation Utilities
 *
 * Provides strict runtime validation for the GenAI API route.
 * Each validator returns { valid: true } or { valid: false, error: string }.
 */

import type {
  GenAIRequestPayload,
  CrowdManagementRequest,
  TranslationRequest,
  SustainabilityRequest,
  GateData,
  EnergyGridData,
} from "@/types/stadium";

/* ------------------------------------------------------------------ */
/*  Result Type                                                        */
/* ------------------------------------------------------------------ */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Primitive Validators                                               */
/* ------------------------------------------------------------------ */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && Number.isFinite(value);
}

function isValidISO8601(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return !isNaN(Date.parse(value));
}

/* ------------------------------------------------------------------ */
/*  Gate Data Validator                                                */
/* ------------------------------------------------------------------ */

function validateGateData(gate: unknown, index: number): ValidationResult {
  const g = gate as GateData;
  if (!g || typeof g !== "object") {
    return { valid: false, error: `gates[${index}] must be an object` };
  }
  if (!isNonEmptyString(g.gateId)) {
    return { valid: false, error: `gates[${index}].gateId must be a non-empty string` };
  }
  if (!isPositiveNumber(g.currentWaitTime)) {
    return { valid: false, error: `gates[${index}].currentWaitTime must be a positive number` };
  }
  if (!isPositiveNumber(g.capacity)) {
    return { valid: false, error: `gates[${index}].capacity must be a positive number` };
  }
  const validZones = ["north", "south", "east", "west"];
  if (!validZones.includes(g.zone)) {
    return { valid: false, error: `gates[${index}].zone must be one of: ${validZones.join(", ")}` };
  }
  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Module-Specific Validators                                         */
/* ------------------------------------------------------------------ */

/** Validates a CrowdManagementRequest payload. */
export function validateCrowdData(data: unknown): ValidationResult {
  const d = data as CrowdManagementRequest;
  if (!d || typeof d !== "object") {
    return { valid: false, error: "crowdData must be an object" };
  }
  if (!isValidISO8601(d.timestamp)) {
    return { valid: false, error: "crowdData.timestamp must be a valid ISO-8601 string" };
  }
  if (!isPositiveNumber(d.totalOccupancy)) {
    return { valid: false, error: "crowdData.totalOccupancy must be a positive number" };
  }
  if (!isPositiveNumber(d.maxCapacity)) {
    return { valid: false, error: "crowdData.maxCapacity must be a positive number" };
  }
  if (d.totalOccupancy > d.maxCapacity * 1.1) {
    return { valid: false, error: "crowdData.totalOccupancy cannot exceed 110% of maxCapacity" };
  }
  if (!Array.isArray(d.gates) || d.gates.length === 0) {
    return { valid: false, error: "crowdData.gates must be a non-empty array" };
  }
  if (d.gates.length > 50) {
    return { valid: false, error: "crowdData.gates cannot have more than 50 entries" };
  }
  for (let i = 0; i < d.gates.length; i++) {
    const result = validateGateData(d.gates[i], i);
    if (!result.valid) return result;
  }
  return { valid: true };
}

/** Validates a TranslationRequest payload. */
export function validateTranslationData(data: unknown): ValidationResult {
  const d = data as TranslationRequest;
  if (!d || typeof d !== "object") {
    return { valid: false, error: "translationData must be an object" };
  }
  if (!isNonEmptyString(d.sourceText)) {
    return { valid: false, error: "translationData.sourceText must be a non-empty string" };
  }
  if (d.sourceText.length > 2000) {
    return { valid: false, error: "translationData.sourceText cannot exceed 2000 characters" };
  }
  if (!isNonEmptyString(d.sourceLanguage)) {
    return { valid: false, error: "translationData.sourceLanguage must be a non-empty string" };
  }
  if (!Array.isArray(d.targetLanguages) || d.targetLanguages.length === 0) {
    return { valid: false, error: "translationData.targetLanguages must be a non-empty array" };
  }
  if (d.targetLanguages.length > 10) {
    return { valid: false, error: "translationData.targetLanguages cannot exceed 10 languages" };
  }
  for (const lang of d.targetLanguages) {
    if (!isNonEmptyString(lang)) {
      return { valid: false, error: "Each target language must be a non-empty string" };
    }
  }
  const validContexts = ["emergency", "general", "wayfinding", "event"];
  if (d.context && !validContexts.includes(d.context)) {
    return {
      valid: false,
      error: `translationData.context must be one of: ${validContexts.join(", ")}`,
    };
  }
  return { valid: true };
}

/** Validates an EnergyGridData entry. */
function validateGridData(grid: unknown, index: number): ValidationResult {
  const g = grid as EnergyGridData;
  if (!g || typeof g !== "object") {
    return { valid: false, error: `grids[${index}] must be an object` };
  }
  if (!isNonEmptyString(g.zone)) {
    return { valid: false, error: `grids[${index}].zone must be a non-empty string` };
  }
  if (!isPositiveNumber(g.currentConsumptionKW)) {
    return { valid: false, error: `grids[${index}].currentConsumptionKW must be a positive number` };
  }
  if (!isPositiveNumber(g.baselineKW)) {
    return { valid: false, error: `grids[${index}].baselineKW must be a positive number` };
  }
  const validHvac = ["active", "idle", "eco-mode"];
  if (!validHvac.includes(g.hvacStatus)) {
    return { valid: false, error: `grids[${index}].hvacStatus must be one of: ${validHvac.join(", ")}` };
  }
  return { valid: true };
}

/** Validates a SustainabilityRequest payload. */
export function validateSustainabilityData(data: unknown): ValidationResult {
  const d = data as SustainabilityRequest;
  if (!d || typeof d !== "object") {
    return { valid: false, error: "sustainabilityData must be an object" };
  }
  if (!isValidISO8601(d.timestamp)) {
    return { valid: false, error: "sustainabilityData.timestamp must be a valid ISO-8601 string" };
  }
  if (!d.weatherConditions || typeof d.weatherConditions !== "object") {
    return { valid: false, error: "sustainabilityData.weatherConditions must be an object" };
  }
  if (typeof d.weatherConditions.temperatureCelsius !== "number") {
    return { valid: false, error: "weatherConditions.temperatureCelsius must be a number" };
  }
  if (typeof d.weatherConditions.humidity !== "number") {
    return { valid: false, error: "weatherConditions.humidity must be a number" };
  }
  if (typeof d.weatherConditions.isRaining !== "boolean") {
    return { valid: false, error: "weatherConditions.isRaining must be a boolean" };
  }
  if (!Array.isArray(d.grids) || d.grids.length === 0) {
    return { valid: false, error: "sustainabilityData.grids must be a non-empty array" };
  }
  for (let i = 0; i < d.grids.length; i++) {
    const result = validateGridData(d.grids[i], i);
    if (!result.valid) return result;
  }
  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Top-Level Payload Validator                                        */
/* ------------------------------------------------------------------ */

/** Validates the entire GenAI API request payload. */
export function validatePayload(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const payload = body as GenAIRequestPayload;
  const validModules = ["crowd-management", "translation", "sustainability"];

  if (!validModules.includes(payload.module)) {
    return {
      valid: false,
      error: `module must be one of: ${validModules.join(", ")}`,
    };
  }

  // Validate that the correct data field is provided for the selected module
  switch (payload.module) {
    case "crowd-management":
      if (!payload.crowdData) {
        return { valid: false, error: "crowdData is required for crowd-management module" };
      }
      return validateCrowdData(payload.crowdData);

    case "translation":
      if (!payload.translationData) {
        return { valid: false, error: "translationData is required for translation module" };
      }
      return validateTranslationData(payload.translationData);

    case "sustainability":
      if (!payload.sustainabilityData) {
        return { valid: false, error: "sustainabilityData is required for sustainability module" };
      }
      return validateSustainabilityData(payload.sustainabilityData);

    default:
      return { valid: false, error: "Unknown module" };
  }
}
