/**
 * Simulated Stadium Data Generator
 *
 * Produces realistic-looking operational data for the StadiumSync AI dashboard.
 * In production, these would come from IoT sensors, ticketing systems, and BMS APIs.
 */

import type {
  GateData,
  CrowdManagementRequest,
  EnergyGridData,
  SustainabilityRequest,
} from "@/types/stadium";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ZONES = ["north", "south", "east", "west"] as const;

const GATE_IDS: Record<(typeof ZONES)[number], string[]> = {
  north: ["N1", "N2", "N3"],
  south: ["S1", "S2", "S3"],
  east: ["E1", "E2"],
  west: ["W1", "W2"],
};

const MAX_CAPACITY = 88_000; // FIFA WC 2026 MetLife-scale stadium

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Returns a random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns a random float rounded to 1 decimal place. */
function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/*  Gate / Crowd Simulation                                            */
/* ------------------------------------------------------------------ */

/** Generates simulated gate data for every entry point. */
export function generateGateData(): GateData[] {
  const gates: GateData[] = [];

  for (const zone of ZONES) {
    for (const id of GATE_IDS[zone]) {
      const capacity = randInt(80, 150);
      const currentWaitTime = randInt(2, capacity + 40); // can exceed capacity
      const utilizationPercent = Math.round((currentWaitTime / capacity) * 100);

      gates.push({
        gateId: `Gate-${id}`,
        currentWaitTime,
        capacity,
        utilizationPercent,
        zone,
      });
    }
  }

  return gates;
}

/** Builds a complete crowd management request payload. */
export function generateCrowdData(): CrowdManagementRequest {
  const gates = generateGateData();
  const totalOccupancy = randInt(45_000, 86_000);

  return {
    timestamp: new Date().toISOString(),
    totalOccupancy,
    maxCapacity: MAX_CAPACITY,
    gates,
  };
}

/* ------------------------------------------------------------------ */
/*  Energy / Sustainability Simulation                                 */
/* ------------------------------------------------------------------ */

/** Generates simulated energy grid data for each zone. */
export function generateEnergyGrids(): EnergyGridData[] {
  return ZONES.map((zone) => ({
    zone: `${zone.charAt(0).toUpperCase()}${zone.slice(1)} Stand`,
    currentConsumptionKW: randFloat(200, 900),
    baselineKW: randFloat(400, 700),
    renewablePercent: randInt(15, 65),
    hvacStatus: (["active", "idle", "eco-mode"] as const)[randInt(0, 2)],
    lightingPercent: randInt(40, 100),
  }));
}

/** Builds a complete sustainability request payload. */
export function generateSustainabilityData(): SustainabilityRequest {
  return {
    timestamp: new Date().toISOString(),
    weatherConditions: {
      temperatureCelsius: randFloat(18, 38),
      humidity: randInt(30, 85),
      isRaining: Math.random() > 0.75,
    },
    grids: generateEnergyGrids(),
  };
}

/* ------------------------------------------------------------------ */
/*  PA Announcement Templates                                          */
/* ------------------------------------------------------------------ */

/** Sample announcements for the multilingual module. */
export const SAMPLE_ANNOUNCEMENTS = [
  "Welcome to the FIFA World Cup 2026! Please follow the signs to your designated seating area.",
  "Attention: Gate N2 is experiencing high traffic. Please use Gate N3 for faster entry.",
  "Emergency notice: Please remain calm and follow staff instructions to the nearest exit.",
  "Half-time refreshments are now available at all concession stands. Contactless payment only.",
  "The match will resume in 5 minutes. Please return to your seats.",
  "Lost and found is located at the Guest Services desk near Gate S1.",
  "Please keep aisles clear at all times for the safety of all spectators.",
  "Water refill stations are available at every gate entrance. Stay hydrated!",
];

/** Available target languages for translation. */
export const TARGET_LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "hi", name: "Hindi" },
] as const;
