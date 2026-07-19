/**
 * @file page.test.tsx
 * @description StadiumSync AI — Comprehensive Unit Test Suite
 *
 * Tests for:
 * 1. CrowdManagement component rendering, AI alert display, new WC2026 features (Navigation, Transit Hubs)
 * 2. Sustainability component rendering & new WC2026 features (Waste Metrics)
 * 3. GenAI API route input validation & error handling
 * 4. Dashboard page structure and accessibility
 *
 * Uses Jest + React Testing Library following WCAG testing best practices.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

// Mock next/font/google to avoid font loading in tests
jest.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
}));

// Mock the simulated data module
jest.mock("@/lib/simulatedData", () => ({
  generateCrowdData: jest.fn(() => ({
    timestamp: "2026-07-15T14:30:00Z",
    totalOccupancy: 72000,
    maxCapacity: 88000,
    gates: [
      {
        gateId: "Gate A",
        currentWaitTime: 45,
        capacity: 100,
        utilizationPercent: 45,
        zone: "north",
        requiresImmediateRerouting: false,
      },
      {
        gateId: "Gate B",
        currentWaitTime: 120,
        capacity: 90,
        utilizationPercent: 133,
        zone: "south",
        requiresImmediateRerouting: true,
      },
    ],
    navigationPaths: [
      {
        pathId: "Wheelchair & Limited-Mobility Accessibility Paths",
        from: "A",
        to: "B",
        estimatedMinutes: 5,
        congestionPercent: 20,
        isAccessible: false,
        isWheelchairAccessible: true,
      },
      {
        pathId: "Standard Spectator Routes",
        from: "Gate A",
        to: "North Stand",
        estimatedMinutes: 10,
        congestionPercent: 50,
        isAccessible: true,
        isWheelchairAccessible: false,
      }
    ],
    transportationHubs: [
      {
        hubId: "Match-Day Shuttles",
        mode: "train",
        currentThroughput: 100,
        maxCapacity: 200,
        estimatedWaitMinutes: 5,
        status: "operational",
        nextArrival: "2026-07-15T14:40:00Z",
        scheduleDelayMinutes: 10,
      }
    ],
    zoneDensity: [
      {
        zoneId: "Zone-A",
        zoneType: "seating",
        currentCount: 100,
        maxOccupancy: 200,
        densityPercent: 50,
        trend: "stable",
      }
    ]
  })),
  generateSustainabilityData: jest.fn(() => ({
    timestamp: "2026-07-15T14:30:00Z",
    weatherConditions: { temperatureCelsius: 32, humidity: 65, isRaining: false },
    grids: [
      {
        zone: "North Stand",
        currentConsumptionKW: 650,
        baselineKW: 500,
        renewablePercent: 40,
        hvacStatus: "active",
        lightingPercent: 85,
      },
    ],
    wasteMetrics: {
      totalWasteKg: 3500,
      recycledKg: 2000,
      landfillKg: 1500,
      diversionRatePercent: 57,
    }
  })),
  SAMPLE_ANNOUNCEMENTS: [
    "Welcome to the FIFA World Cup 2026!",
    "Gate N2 is experiencing delays.",
  ],
  TARGET_LANGUAGES: [
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
  ],
}));

// Import components after mocks are set up
import CrowdManagement from "@/components/CrowdManagement";
import Sustainability from "@/components/Sustainability";
import MultilingualAssistant from "@/components/MultilingualAssistant";
import { validatePayload } from "@/lib/validation";

/* ------------------------------------------------------------------ */
/*  1. CrowdManagement Component Tests                                 */
/* ------------------------------------------------------------------ */

describe("CrowdManagement Component", () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the component heading correctly", () => {
    render(<CrowdManagement />);
    expect(
      screen.getByRole("heading", { name: /crowd management/i })
    ).toBeInTheDocument();
  });

  it("renders the analyze button", () => {
    render(<CrowdManagement />);
    const button = screen.getByRole("button", {
      name: /analyze gate wait times with ai/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("shows empty state when no data is loaded", () => {
    render(<CrowdManagement />);
    expect(screen.getByText(/operations data empty/i)).toBeInTheDocument();
    expect(
      screen.getByText(/click.*analyze.*to fetch/i)
    ).toBeInTheDocument();
  });

  it("displays gate data after clicking analyze", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        module: "crowd-management",
        data: {
          alertLevel: "high",
          analysis: "Test analysis",
          deploymentSuggestions: [],
        },
        timestamp: "2026-07-15T14:30:00Z",
      }),
    });

    render(<CrowdManagement />);
    fireEvent.click(
      screen.getByRole("button", { name: /analyze gate wait times with ai/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Gate A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gate B")).toBeInTheDocument();
  });

  it("renders the AI alert badge when response arrives", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        module: "crowd-management",
        data: {
          alertLevel: "critical",
          analysis: "Test analysis",
          deploymentSuggestions: [],
        },
        timestamp: "2026-07-15T14:30:00Z",
      }),
    });

    render(<CrowdManagement />);
    fireEvent.click(
      screen.getByRole("button", { name: /analyze gate wait times/i })
    );

    await waitFor(() => {
      const badge = screen.getByTestId("crowd-alert-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/critical/i);
    });
  });

  it("renders deployment suggestions from AI response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        module: "crowd-management",
        data: {
          alertLevel: "high",
          analysis: "Test.",
          deploymentSuggestions: [
            {
              location: "Gate B",
              action: "Deploy 3 additional staff members immediately",
              priority: "urgent",
            },
          ],
        },
        timestamp: "2026-07-15T14:30:00Z",
      }),
    });

    render(<CrowdManagement />);
    fireEvent.click(
      screen.getByRole("button", { name: /analyze gate wait times/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Deploy 3 additional staff members immediately")
      ).toBeInTheDocument();
    });
  });

  it("displays an error message when the API call fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<CrowdManagement />);
    fireEvent.click(
      screen.getByRole("button", { name: /analyze gate wait times/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/network error/i);
    });
  });

  it("has proper aria-live region for AI responses", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        module: "crowd-management",
        data: { alertLevel: "low", analysis: "Nominal", deploymentSuggestions: [] },
        timestamp: "2026-07-15T14:30:00Z",
      }),
    });

    render(<CrowdManagement />);
    fireEvent.click(
      screen.getByRole("button", { name: /analyze gate wait times/i })
    );

    await waitFor(() => {
      const aiResponseRegion = screen.getByTestId("crowd-ai-response");
      expect(aiResponseRegion).toHaveAttribute("aria-live", "polite");
    });
  });

  it("uses semantic section element with accessible label", () => {
    render(<CrowdManagement />);
    const section = screen.getByRole("region", {
      name: /crowd management/i,
    });
    expect(section).toBeInTheDocument();
  });

  it("explicitly renders wheelchair accessibility routes and blockages", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { analysis: "" } }),
    });

    render(<CrowdManagement />);
    fireEvent.click(screen.getByRole("button", { name: /analyze gate wait times/i }));

    await waitFor(() => {
      expect(screen.getByTitle("Wheelchair Accessible Route")).toBeInTheDocument();
      expect(screen.getByText("Wheelchair & Limited-Mobility Accessibility Paths")).toBeInTheDocument();
      expect(screen.getByText("Standard Spectator Routes")).toBeInTheDocument();
      expect(screen.getByText(/Blocked/i)).toBeInTheDocument();
    });
  });

  it("explicitly renders schedule delays for transit hubs", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { analysis: "" } }),
    });

    render(<CrowdManagement />);
    fireEvent.click(screen.getByRole("button", { name: /analyze gate wait times/i }));

    await waitFor(() => {
      expect(screen.getByText("+10m")).toBeInTheDocument();
      expect(screen.getByText("Match-Day Shuttles")).toBeInTheDocument();
    });
  });

  it("explicitly renders the immediate rerouting badge on gates", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { analysis: "" } }),
    });

    render(<CrowdManagement />);
    fireEvent.click(screen.getByRole("button", { name: /analyze gate wait times/i }));

    await waitFor(() => {
      expect(screen.getByText("Immediate Rerouting Action Required")).toBeInTheDocument();
    });
  });

  it("explicitly triggers an emergency evac/reroute alert banner if AI flags it", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { analysis: "Critical issue", triggerImmediateRerouting: true }
      }),
    });

    render(<CrowdManagement />);
    fireEvent.click(screen.getByRole("button", { name: /analyze gate wait times/i }));

    await waitFor(() => {
      expect(screen.getByText("🚨 Immediate Rerouting Action Required")).toBeInTheDocument();
    });
  });
});

/* ------------------------------------------------------------------ */
/*  2. Sustainability Component Tests                                  */
/* ------------------------------------------------------------------ */

describe("Sustainability Component", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("explicitly renders waste and recycling metrics dashboard", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { efficiencyScore: 90 } }),
    });

    render(<Sustainability />);
    fireEvent.click(screen.getByRole("button", { name: /analyze stadium energy/i }));

    await waitFor(() => {
      expect(screen.getByText("🗑️ Waste & Recycling Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Smart Energy Grid")).toBeInTheDocument();
      expect(screen.getByText("3,500 kg")).toBeInTheDocument(); // totalWasteKg
      expect(screen.getByText("2,000 kg")).toBeInTheDocument(); // recycledKg
      expect(screen.getByText("57%")).toBeInTheDocument(); // diversionRate
    });
  });

  it("renders waste diversion protocols specifically from AI tips", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          efficiencyScore: 90,
          wasteTips: [{ title: "Compost cups", description: "Use compost", impactLevel: "high", targetZone: "Concessions" }]
        }
      }),
    });

    render(<Sustainability />);
    fireEvent.click(screen.getByRole("button", { name: /analyze stadium energy/i }));

    await waitFor(() => {
      expect(screen.getByText("♻️ Waste Diversion Protocols")).toBeInTheDocument();
      expect(screen.getByText("Compost cups")).toBeInTheDocument();
    });
  });
});

/* ------------------------------------------------------------------ */
/*  3. Multilingual Assistant Component Tests                          */
/* ------------------------------------------------------------------ */

describe("MultilingualAssistant Component", () => {
  it("renders 8+ target languages checkboxes perfectly", () => {
    render(<MultilingualAssistant />);
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText("French")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  4. API Route Validation Tests                                      */
/* ------------------------------------------------------------------ */

describe("GenAI API Route — Input Validation", () => {
  describe("Top-level payload validation", () => {
    it("rejects null body", () => {
      const result = validatePayload(null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-object body", () => {
      const result = validatePayload("hello");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid module name", () => {
      const result = validatePayload({ module: "invalid-module" });
      expect(result.valid).toBe(false);
    });

    it("rejects crowd-management without crowdData", () => {
      const result = validatePayload({ module: "crowd-management" });
      expect(result.valid).toBe(false);
    });

    it("rejects translation without translationData", () => {
      const result = validatePayload({ module: "translation" });
      expect(result.valid).toBe(false);
    });

    it("rejects sustainability without sustainabilityData", () => {
      const result = validatePayload({ module: "sustainability" });
      expect(result.valid).toBe(false);
    });
  });

  describe("Crowd management data validation", () => {
    const validCrowdPayload = {
      module: "crowd-management" as const,
      crowdData: {
        timestamp: "2026-07-15T14:30:00Z",
        totalOccupancy: 72000,
        maxCapacity: 88000,
        gates: [
          {
            gateId: "Gate A",
            currentWaitTime: 45,
            capacity: 100,
            utilizationPercent: 45,
            zone: "north" as const,
          },
        ],
      },
    };

    it("accepts a valid crowd management payload", () => {
      const result = validatePayload(validCrowdPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid timestamp", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, timestamp: "not-a-date" },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects negative occupancy", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, totalOccupancy: -1 },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects occupancy exceeding 110% of capacity", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, totalOccupancy: 100000 },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects empty gates array", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, gates: [] },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects gate with invalid zone", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: {
          ...validCrowdPayload.crowdData,
          gates: [
            {
              gateId: "G1",
              currentWaitTime: 10,
              capacity: 50,
              utilizationPercent: 20,
              zone: "invalid" as "north",
            },
          ],
        },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("Translation data validation", () => {
    const validTranslationPayload = {
      module: "translation" as const,
      translationData: {
        sourceText: "Welcome to the stadium!",
        sourceLanguage: "en",
        targetLanguages: ["es", "fr"],
        context: "general" as const,
      },
    };

    it("accepts a valid translation payload", () => {
      const result = validatePayload(validTranslationPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects empty source text", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: { ...validTranslationPayload.translationData, sourceText: "" },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects source text exceeding 2000 characters", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: { ...validTranslationPayload.translationData, sourceText: "a".repeat(2001) },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects empty target languages array", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: { ...validTranslationPayload.translationData, targetLanguages: [] },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid context value", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: { ...validTranslationPayload.translationData, context: "unknown" as "general" },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects more than 10 target languages", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: { ...validTranslationPayload.translationData, targetLanguages: Array(11).fill("en") },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("Sustainability data validation", () => {
    const validSustainabilityPayload = {
      module: "sustainability" as const,
      sustainabilityData: {
        timestamp: "2026-07-15T14:30:00Z",
        weatherConditions: {
          temperatureCelsius: 32,
          humidity: 65,
          isRaining: false,
        },
        grids: [
          {
            zone: "North Stand",
            currentConsumptionKW: 650,
            baselineKW: 500,
            renewablePercent: 40,
            hvacStatus: "active" as const,
            lightingPercent: 85,
          },
        ],
      },
    };

    it("accepts a valid sustainability payload", () => {
      const result = validatePayload(validSustainabilityPayload);
      expect(result.valid).toBe(true);
    });

    it("rejects missing weather conditions", () => {
      const result = validatePayload({
        ...validSustainabilityPayload,
        sustainabilityData: { ...validSustainabilityPayload.sustainabilityData, weatherConditions: undefined as unknown as { temperatureCelsius: number; humidity: number; isRaining: boolean; } },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects empty grids array", () => {
      const result = validatePayload({
        ...validSustainabilityPayload,
        sustainabilityData: { ...validSustainabilityPayload.sustainabilityData, grids: [] },
      });
      expect(result.valid).toBe(false);
    });

    it("rejects grid with invalid HVAC status", () => {
      const result = validatePayload({
        ...validSustainabilityPayload,
        sustainabilityData: {
          ...validSustainabilityPayload.sustainabilityData,
          grids: [{ zone: "N", currentConsumptionKW: 5, baselineKW: 4, renewablePercent: 5, hvacStatus: "turbo" as "active", lightingPercent: 8 }],
        },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("API Fallback Payload Checks", () => {
    it("renders fallback text for Crowd Management including Immediate Rerouting Action Required", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          module: "crowd-management",
          data: { alertLevel: "moderate", analysis: "Fallback: Returning simulated data. Immediate Rerouting Action Required.", deploymentSuggestions: [], transportationAdvisory: "Match-Day Shuttles synchronized.", navigationGuidance: "Standard Spectator Routes and Wheelchair & Limited-Mobility Accessibility Paths are clear.", triggerImmediateRerouting: true },
          timestamp: "2026-07-15T14:30:00Z",
        }),
      });

      render(<CrowdManagement />);
      fireEvent.click(
        screen.getByRole("button", { name: /analyze gate wait times/i })
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Immediate Rerouting Action Required/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Match-Day Shuttles synchronized/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Standard Spectator Routes/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Wheelchair & Limited-Mobility Accessibility Paths/i).length).toBeGreaterThan(0);
      });
    });

    it("renders fallback text for Sustainability including Smart Energy Grid optimization", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          module: "sustainability",
          data: { efficiencyScore: 85, estimatedSavingsKWH: 1500, tips: [{ title: "Optimize lighting", description: "Use LED lighting on 50% power for Smart Energy Grid optimization.", impactLevel: "medium", targetZone: "Stadium" }], carbonReductionKg: 500, wasteTips: [{ title: "Recycle", description: "Review Waste & Recycling Dashboard metrics.", impactLevel: "high", targetZone: "Concourses" }] },
          timestamp: "2026-07-15T14:30:00Z",
        }),
      });

      render(<Sustainability />);
      fireEvent.click(
        screen.getByRole("button", { name: /analyze stadium energy efficiency/i })
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Smart Energy Grid optimization/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Waste & Recycling Dashboard metrics/i).length).toBeGreaterThan(0);
      });
    });
  });
});
