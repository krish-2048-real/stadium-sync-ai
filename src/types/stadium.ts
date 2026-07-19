/**
 * StadiumSync AI — Core TypeScript Interfaces
 *
 * Defines all data structures used across the dashboard for
 * crowd management, multilingual announcements, sustainability modules,
 * and FIFA World Cup 2026–specific operational data (transportation hubs,
 * stadium navigation, and venue crowd density intelligence).
 */

/* ------------------------------------------------------------------ */
/*  Gate & Crowd Management Types                                      */
/* ------------------------------------------------------------------ */

/** Represents a single entry gate with real-time wait data. */
export interface GateData {
  /** Unique gate identifier, e.g. "Gate-A1" */
  gateId: string;
  /** Current queue length (persons) */
  currentWaitTime: number;
  /** Maximum safe capacity for this gate per minute */
  capacity: number;
  /** Occupancy ratio: currentWaitTime / capacity */
  utilizationPercent: number;
  /** Geographic zone the gate belongs to */
  zone: "north" | "south" | "east" | "west";
}

/** Summary payload sent to the AI for crowd analysis. */
export interface CrowdManagementRequest {
  /** ISO-8601 timestamp of the snapshot */
  timestamp: string;
  /** Total stadium occupancy at the moment */
  totalOccupancy: number;
  /** Maximum stadium capacity */
  maxCapacity: number;
  /** Per-gate breakdown */
  gates: GateData[];
  /** Real-time transportation hub data for the FIFA WC 2026 venue */
  transportationHubs?: TransportationHub[];
  /** Dynamic navigation path data showing crowd flow through the stadium */
  navigationPaths?: NavigationPath[];
  /** Per-zone crowd density heatmap data */
  zoneDensity?: ZoneDensityData[];
}

/** AI-generated crowd management recommendation. */
export interface CrowdManagementResponse {
  /** Human-readable alert level */
  alertLevel: "low" | "moderate" | "high" | "critical";
  /** AI-generated analysis text */
  analysis: string;
  /** Specific staff deployment recommendations */
  deploymentSuggestions: DeploymentSuggestion[];
  /** Transportation hub recommendations (optional, present when hub data supplied) */
  transportationAdvisory?: string;
  /** Dynamic navigation suggestions (optional) */
  navigationGuidance?: string;
}

/** A single staff deployment recommendation. */
export interface DeploymentSuggestion {
  /** Target gate or zone */
  location: string;
  /** Action to take */
  action: string;
  /** Priority level */
  priority: "low" | "medium" | "high" | "urgent";
}

/* ------------------------------------------------------------------ */
/*  FIFA WC 2026 — Transportation Hub Types                            */
/* ------------------------------------------------------------------ */

/** Multi-modal transportation hub connected to the stadium venue. */
export interface TransportationHub {
  /** Hub identifier, e.g. "MetLife Train Station", "Lot-A Parking" */
  hubId: string;
  /** Type of transportation mode */
  mode: "train" | "bus" | "parking" | "rideshare" | "pedestrian";
  /** Current passenger/vehicle throughput per minute */
  currentThroughput: number;
  /** Maximum hub capacity per minute */
  maxCapacity: number;
  /** Estimated wait time in minutes */
  estimatedWaitMinutes: number;
  /** Status of the hub */
  status: "operational" | "congested" | "closed" | "diverting";
  /** Next scheduled arrival (ISO-8601), applicable for train/bus */
  nextArrival?: string;
}

/** Dynamic navigation path within the stadium complex. */
export interface NavigationPath {
  /** Path identifier, e.g. "Concourse-North-A" */
  pathId: string;
  /** Starting location */
  from: string;
  /** Destination location */
  to: string;
  /** Estimated traversal time in minutes */
  estimatedMinutes: number;
  /** Current congestion level (0-100 scale) */
  congestionPercent: number;
  /** Whether the path is currently accessible */
  isAccessible: boolean;
  /** Whether this path is wheelchair accessible */
  isWheelchairAccessible: boolean;
}

/** Per-zone crowd density data for real-time venue heatmapping. */
export interface ZoneDensityData {
  /** Zone identifier, e.g. "North Upper Deck", "South Concourse" */
  zoneId: string;
  /** Zone type */
  zoneType: "seating" | "concourse" | "concession" | "restroom" | "exit";
  /** Current person count in the zone */
  currentCount: number;
  /** Maximum safe occupancy for this zone */
  maxOccupancy: number;
  /** Density percentage (currentCount / maxOccupancy * 100) */
  densityPercent: number;
  /** Trend direction over the last 5 minutes */
  trend: "increasing" | "stable" | "decreasing";
}

/* ------------------------------------------------------------------ */
/*  Multilingual Assistant Types                                       */
/* ------------------------------------------------------------------ */

/** Request to translate a PA announcement. */
export interface TranslationRequest {
  /** Original announcement text */
  sourceText: string;
  /** ISO 639-1 source language code */
  sourceLanguage: string;
  /** Target language codes */
  targetLanguages: string[];
  /** Optional context (e.g. "emergency", "general") */
  context?: "emergency" | "general" | "wayfinding" | "event";
}

/** AI-generated translation result. */
export interface TranslationResponse {
  /** Original text echoed back */
  originalText: string;
  /** Array of translated outputs */
  translations: TranslatedText[];
}

/** A single translated text block. */
export interface TranslatedText {
  /** ISO 639-1 language code */
  language: string;
  /** Human-readable language name */
  languageName: string;
  /** Translated text */
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Sustainability / Energy Module Types                               */
/* ------------------------------------------------------------------ */

/** Simulated power grid data for the stadium. */
export interface EnergyGridData {
  /** Zone identifier */
  zone: string;
  /** Current consumption in kW */
  currentConsumptionKW: number;
  /** Baseline expected consumption in kW */
  baselineKW: number;
  /** Renewable energy contribution percentage (0-100) */
  renewablePercent: number;
  /** HVAC system status */
  hvacStatus: "active" | "idle" | "eco-mode";
  /** Lighting level percentage (0-100) */
  lightingPercent: number;
}

/** Request for sustainability analysis. */
export interface SustainabilityRequest {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Weather conditions affecting energy use */
  weatherConditions: {
    temperatureCelsius: number;
    humidity: number;
    isRaining: boolean;
  };
  /** Per-zone energy grid data */
  grids: EnergyGridData[];
}

/** AI-generated sustainability tips. */
export interface SustainabilityResponse {
  /** Overall energy efficiency score (0-100) */
  efficiencyScore: number;
  /** Total estimated savings in kWh */
  estimatedSavingsKWH: number;
  /** Actionable tips */
  tips: EnergyTip[];
  /** Carbon footprint reduction estimate in kg CO₂ */
  carbonReductionKg: number;
}

/** A single energy efficiency tip. */
export interface EnergyTip {
  /** Short title */
  title: string;
  /** Detailed recommendation */
  description: string;
  /** Estimated savings impact */
  impactLevel: "low" | "medium" | "high";
  /** Target zone */
  targetZone: string;
}

/* ------------------------------------------------------------------ */
/*  Unified API Types                                                  */
/* ------------------------------------------------------------------ */

/** Discriminated union for GenAI API request body. */
export interface GenAIRequestPayload {
  /** Which AI module to invoke */
  module: "crowd-management" | "translation" | "sustainability";
  /** Module-specific data — exactly one should be provided */
  crowdData?: CrowdManagementRequest;
  translationData?: TranslationRequest;
  sustainabilityData?: SustainabilityRequest;
}

/** Standardised API response wrapper. */
export interface GenAIApiResponse<T = unknown> {
  /** Whether the call succeeded */
  success: boolean;
  /** Module that produced the response */
  module: GenAIRequestPayload["module"];
  /** Payload (present on success) */
  data?: T;
  /** Error message (present on failure) */
  error?: string;
  /** Server timestamp */
  timestamp: string;
  /** Whether the response was served from cache */
  cached?: boolean;
}

/** Combined type for any AI module response */
export type AIModuleResponse =
  | CrowdManagementResponse
  | TranslationResponse
  | SustainabilityResponse;
