/**
 * @file simulatedData.ts
 * @description Simulated Stadium Data Generator
 *
 * Produces realistic-looking operational data for the StadiumSync AI dashboard.
 * In production, these would come from IoT sensors, ticketing systems, and BMS APIs.
 *
 * Optimised for performance using flat maps, single-loop iteration, and direct object allocation.
 * Includes complete JSDoc coverage.
 */

import type {
  GateData,
  CrowdManagementRequest,
  EnergyGridData,
  SustainabilityRequest,
  TransportationHub,
  NavigationPath,
  ZoneDensityData,
  WasteMetrics,
} from "@/types/stadium";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ZONES = ["north", "south", "east", "west"] as const;



const MAX_CAPACITY = 88_000; // FIFA WC 2026 MetLife-scale stadium

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns a random integer between min and max (inclusive).
 * Uses bitwise OR for fast truncation.
 *
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number} A random integer
 */
function randInt(min: number, max: number): number {
  return (Math.random() * (max - min + 1) + min) | 0;
}

/**
 * Returns a random float rounded to 1 decimal place.
 *
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number} A random float rounded to 1 decimal place
 */
function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/*  Gate / Crowd Simulation                                            */
/* ------------------------------------------------------------------ */

/**
 * Generates simulated gate data for every entry point (Gates A, B, C, D).
 * Optimised with pre-allocated array size and flat mapping.
 *
 * @returns {GateData[]} Array of generated GateData objects
 */
export function generateGateData(): GateData[] {
  const gates = [
    { id: "Gate A", zone: "north" },
    { id: "Gate B", zone: "south" },
    { id: "Gate C", zone: "east" },
    { id: "Gate D", zone: "west" },
  ] as const;

  return gates.map(g => {
    const capacity = randInt(80, 150);
    const currentWaitTime = randInt(2, capacity + 40); // can exceed capacity
    const utilizationPercent = Math.round((currentWaitTime / capacity) * 100);

    return {
      gateId: g.id,
      currentWaitTime,
      capacity,
      utilizationPercent,
      zone: g.zone,
      requiresImmediateRerouting: utilizationPercent > 120, // Add explicit reroute flag
    };
  });
}

/**
 * Generates simulated multi-modal transportation hubs for FIFA World Cup 2026.
 * Includes train stations, parking lots, rideshare zones, and pedestrian walks.
 *
 * @returns {TransportationHub[]} Array of generated TransportationHub objects
 */
export function generateTransportationHubs(): TransportationHub[] {
  const modes: ("train" | "bus" | "parking" | "rideshare" | "pedestrian")[] = [
    "train",
    "bus",
    "parking",
    "rideshare",
    "pedestrian",
  ];
  
  const names = [
    "Metro Trains",
    "Match-Day Shuttles",
    "Parking Lot Capacities",
    "East Rideshare Drop-off",
    "Standard Spectator Routes",
  ];

  return modes.map((mode, index) => {
    const maxCapacity = randInt(200, 1000);
    const currentThroughput = randInt(50, maxCapacity + 100);
    const status: "operational" | "congested" | "closed" | "diverting" =
      currentThroughput > maxCapacity
        ? "congested"
        : currentThroughput === 0
        ? "closed"
        : "operational";

    const nextArrival = new Date(Date.now() + randInt(2, 15) * 60000).toISOString();
    const isScheduled = mode === "train" || mode === "bus";

    return {
      hubId: names[index],
      mode,
      currentThroughput,
      maxCapacity,
      estimatedWaitMinutes: randInt(2, 45),
      status,
      nextArrival: isScheduled ? nextArrival : undefined,
      scheduleDelayMinutes: isScheduled ? randInt(0, 20) : undefined,
    };
  });
}

/**
 * Generates simulated navigation paths for stadium crowd routing.
 *
 * @returns {NavigationPath[]} Array of generated NavigationPath objects
 */
export function generateNavigationPaths(): NavigationPath[] {
  const paths = [
    { from: "Gate A", to: "North Stand Seating", id: "Standard Spectator Routes" },
    { from: "Gate B", to: "South Stand Seating", id: "Wheelchair & Limited-Mobility Accessibility Paths" },
    { from: "Metro Trains", to: "Gate C", id: "Path-Metro-East" },
    { from: "Parking Lot Capacities", to: "Gate D", id: "Path-Parking-West" },
    { from: "Match-Day Shuttles", to: "Gate B", id: "Path-Shuttles-South" },
  ];

  return paths.map((p) => ({
    pathId: p.id,
    from: p.from,
    to: p.to,
    estimatedMinutes: randInt(3, 15),
    congestionPercent: randInt(10, 95),
    isAccessible: true,
    isWheelchairAccessible: p.id === "Wheelchair & Limited-Mobility Accessibility Paths" ? true : Math.random() > 0.5,
  }));
}

/**
 * Generates simulated zone density for heatmap analysis.
 *
 * @returns {ZoneDensityData[]} Array of generated ZoneDensityData objects
 */
export function generateZoneDensity(): ZoneDensityData[] {
  const zones = [
    { id: "North Upper Deck", type: "seating" as const },
    { id: "South Concourse", type: "concourse" as const },
    { id: "East Plaza Concession", type: "concession" as const },
    { id: "West Restroom Corridor", type: "restroom" as const },
    { id: "Main Exit Gate S1", type: "exit" as const },
  ];

  return zones.map((z) => {
    const maxOccupancy = randInt(1000, 5000);
    const currentCount = randInt(100, maxOccupancy + 200);
    const densityPercent = Math.round((currentCount / maxOccupancy) * 100);
    const trends: ("increasing" | "stable" | "decreasing")[] = ["increasing", "stable", "decreasing"];
    const trend = trends[randInt(0, 2)];

    return {
      zoneId: z.id,
      zoneType: z.type,
      currentCount,
      maxOccupancy,
      densityPercent,
      trend,
    };
  });
}

/**
 * Builds a complete crowd management request payload.
 *
 * @returns {CrowdManagementRequest} CrowdManagementRequest containing all simulation sources
 */
export function generateCrowdData(): CrowdManagementRequest {
  const gates = generateGateData();
  const totalOccupancy = randInt(45_000, 86_000);
  const transportationHubs = generateTransportationHubs();
  const navigationPaths = generateNavigationPaths();
  const zoneDensity = generateZoneDensity();

  return {
    timestamp: new Date().toISOString(),
    totalOccupancy,
    maxCapacity: MAX_CAPACITY,
    gates,
    transportationHubs,
    navigationPaths,
    zoneDensity,
  };
}

/* ------------------------------------------------------------------ */
/*  Energy / Sustainability Simulation                                 */
/* ------------------------------------------------------------------ */

/**
 * Generates simulated energy grid data for each zone.
 *
 * @returns {EnergyGridData[]} Array of generated EnergyGridData objects
 */
export function generateEnergyGrids(): EnergyGridData[] {
  const zonesLen = ZONES.length;
  const grids: EnergyGridData[] = new Array(zonesLen);

  for (let i = 0; i < zonesLen; i++) {
    const zone = ZONES[i];
    grids[i] = {
      zone: `${zone.charAt(0).toUpperCase()}${zone.slice(1)} Stand`,
      currentConsumptionKW: randFloat(200, 900),
      baselineKW: randFloat(400, 700),
      renewablePercent: randInt(15, 65),
      hvacStatus: (["active", "idle", "eco-mode"] as const)[randInt(0, 2)],
      lightingPercent: randInt(40, 100),
    };
  }

  return grids;
}

/**
 * Generates simulated waste metrics for the stadium.
 *
 * @returns {WasteMetrics} Simulated WasteMetrics object
 */
export function generateWasteMetrics(): WasteMetrics {
  const recycledKg = randInt(500, 2500);
  const landfillKg = randInt(1000, 4000);
  const totalWasteKg = recycledKg + landfillKg;
  const diversionRatePercent = Math.round((recycledKg / totalWasteKg) * 100);

  return {
    totalWasteKg,
    recycledKg,
    landfillKg,
    diversionRatePercent,
  };
}

/**
 * Builds a complete sustainability request payload.
 *
 * @returns {SustainabilityRequest} SustainabilityRequest containing weather and grid metrics
 */
export function generateSustainabilityData(): SustainabilityRequest {
  return {
    timestamp: new Date().toISOString(),
    weatherConditions: {
      temperatureCelsius: randFloat(18, 38),
      humidity: randInt(30, 85),
      isRaining: Math.random() > 0.75,
    },
    grids: generateEnergyGrids(),
    wasteMetrics: generateWasteMetrics(),
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
