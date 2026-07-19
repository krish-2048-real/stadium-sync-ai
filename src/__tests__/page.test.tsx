/**
 * StadiumSync AI — Comprehensive Unit Test Suite
 *
 * Tests for:
 * 1. CrowdManagement component rendering & AI alert display
 * 2. GenAI API route input validation & error handling
 * 3. Dashboard page structure and accessibility
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
        gateId: "Gate-N1",
        currentWaitTime: 45,
        capacity: 100,
        utilizationPercent: 45,
        zone: "north",
      },
      {
        gateId: "Gate-S1",
        currentWaitTime: 120,
        capacity: 90,
        utilizationPercent: 133,
        zone: "south",
      },
      {
        gateId: "Gate-E1",
        currentWaitTime: 80,
        capacity: 100,
        utilizationPercent: 80,
        zone: "east",
      },
    ],
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
    // Mock a successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        module: "crowd-management",
        data: {
          alertLevel: "high",
          analysis:
            "Gate S1 is significantly over capacity. Immediate staff reallocation recommended.",
          deploymentSuggestions: [
            {
              location: "Gate-S1",
              action: "Deploy 3 additional staff members immediately",
              priority: "urgent",
            },
            {
              location: "Gate-N1",
              action: "Redirect overflow from S1 to N1",
              priority: "high",
            },
          ],
        },
        timestamp: "2026-07-15T14:30:00Z",
      }),
    });

    render(<CrowdManagement />);

    // Click the analyze button
    const button = screen.getByRole("button", {
      name: /analyze gate wait times with ai/i,
    });
    fireEvent.click(button);

    // Wait for gate data to render
    await waitFor(() => {
      expect(screen.getByText("Gate-N1")).toBeInTheDocument();
    });

    // Verify gates are displayed
    expect(screen.getByText("Gate-S1")).toBeInTheDocument();
    expect(screen.getByText("Gate-E1")).toBeInTheDocument();
  });

  it("renders the AI alert badge when response arrives", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        module: "crowd-management",
        data: {
          alertLevel: "critical",
          analysis: "Multiple gates at critical capacity. Emergency protocol advised.",
          deploymentSuggestions: [
            {
              location: "All Gates",
              action: "Activate emergency crowd control protocol",
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

    // Wait for the alert badge to render
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
          analysis: "Gate S1 is over capacity.",
          deploymentSuggestions: [
            {
              location: "Gate-S1",
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
        data: {
          alertLevel: "low",
          analysis: "All systems nominal.",
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
});

/* ------------------------------------------------------------------ */
/*  2. API Route Validation Tests                                      */
/* ------------------------------------------------------------------ */

describe("GenAI API Route — Input Validation", () => {
  describe("Top-level payload validation", () => {
    it("rejects null body", () => {
      const result = validatePayload(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("JSON object");
    });

    it("rejects non-object body", () => {
      const result = validatePayload("hello");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid module name", () => {
      const result = validatePayload({ module: "invalid-module" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("module must be one of");
    });

    it("rejects crowd-management without crowdData", () => {
      const result = validatePayload({ module: "crowd-management" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("crowdData is required");
    });

    it("rejects translation without translationData", () => {
      const result = validatePayload({ module: "translation" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("translationData is required");
    });

    it("rejects sustainability without sustainabilityData", () => {
      const result = validatePayload({ module: "sustainability" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sustainabilityData is required");
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
            gateId: "Gate-N1",
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
      expect(result.error).toContain("timestamp");
    });

    it("rejects negative occupancy", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, totalOccupancy: -1 },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("totalOccupancy");
    });

    it("rejects occupancy exceeding 110% of capacity", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, totalOccupancy: 100000 },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("110%");
    });

    it("rejects empty gates array", () => {
      const result = validatePayload({
        ...validCrowdPayload,
        crowdData: { ...validCrowdPayload.crowdData, gates: [] },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-empty array");
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
      expect(result.error).toContain("zone");
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
        translationData: {
          ...validTranslationPayload.translationData,
          sourceText: "",
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sourceText");
    });

    it("rejects source text exceeding 2000 characters", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: {
          ...validTranslationPayload.translationData,
          sourceText: "a".repeat(2001),
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("2000");
    });

    it("rejects empty target languages array", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: {
          ...validTranslationPayload.translationData,
          targetLanguages: [],
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-empty array");
    });

    it("rejects invalid context value", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: {
          ...validTranslationPayload.translationData,
          context: "unknown" as "general",
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("context");
    });

    it("rejects more than 10 target languages", () => {
      const result = validatePayload({
        ...validTranslationPayload,
        translationData: {
          ...validTranslationPayload.translationData,
          targetLanguages: Array(11).fill("en"),
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("10");
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
        sustainabilityData: {
          ...validSustainabilityPayload.sustainabilityData,
          weatherConditions: undefined as unknown as {
            temperatureCelsius: number;
            humidity: number;
            isRaining: boolean;
          },
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("weatherConditions");
    });

    it("rejects empty grids array", () => {
      const result = validatePayload({
        ...validSustainabilityPayload,
        sustainabilityData: {
          ...validSustainabilityPayload.sustainabilityData,
          grids: [],
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("non-empty array");
    });

    it("rejects grid with invalid HVAC status", () => {
      const result = validatePayload({
        ...validSustainabilityPayload,
        sustainabilityData: {
          ...validSustainabilityPayload.sustainabilityData,
          grids: [
            {
              zone: "North",
              currentConsumptionKW: 500,
              baselineKW: 400,
              renewablePercent: 50,
              hvacStatus: "turbo" as "active",
              lightingPercent: 80,
            },
          ],
        },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("hvacStatus");
    });
  });
});
