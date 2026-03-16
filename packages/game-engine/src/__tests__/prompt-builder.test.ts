import { describe, it, expect } from "vitest";
import { buildPrompt } from "../prompt-builder.js";
import { createStarterState, CharacterClass } from "@crit-commit/shared";
import type { BatchedEvents, CodingEventSummary } from "@crit-commit/shared";

function makeMockEvents(): BatchedEvents {
  const summary: CodingEventSummary = {
    edits: 5,
    newFiles: 2,
    deletions: 0,
    testsRun: 3,
    testsPassed: 3,
    testsFailed: 0,
    grepSearches: 2,
    globSearches: 1,
    fileReads: 10,
    gitCommits: 1,
    gitPushes: 0,
    gitPulls: 0,
    buildAttempts: 1,
    buildSuccesses: 1,
    buildFailures: 0,
    subAgentsSpawned: 0,
    subAgentsCompleted: 0,
    complexPrompts: 0,
    languagesDetected: ["TypeScript"],
    frameworksDetected: ["Vitest"],
    sessionDurationMinutes: 15,
    toolUsageCounts: { Edit: 5, Read: 10, Grep: 2 },
  };

  return {
    timestamp: new Date().toISOString(),
    batchId: "test-batch-1",
    totalEvents: summary,
    terminals: [],
    terminalsActive: 1,
    batchIntervalMinutes: 5,
    isFirstBatchOfDay: false,
    critEligibleEvents: [],
    milestoneEvents: [],
    playerId: "test-player",
    playerTimezone: "UTC",
  };
}

describe("buildPrompt", () => {
  it("includes game master system instructions", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toContain("game master");
    expect(prompt).toContain("Crit Commit");
  });

  it("includes game state as JSON", () => {
    const state = createStarterState("Hero", CharacterClass.Scout);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toContain('"level": 1');
    expect(prompt).toContain('"class": "scout"');
    expect(prompt).toContain("Hero");
  });

  it("includes batched events", () => {
    const state = createStarterState("Hero", CharacterClass.Artificer);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toContain("edits");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("test-batch-1");
  });

  it("includes NPC franchise list", () => {
    const state = createStarterState("Hero", CharacterClass.Battlemage);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toContain("Star Wars");
    expect(prompt).toContain("LOTR");
    expect(prompt).toContain("Zelda");
    expect(prompt).toContain("Final Fantasy");
    expect(prompt).toContain("Matrix");
    expect(prompt).toContain("Mario");
    expect(prompt).toContain("TMNT");
  });

  it("instructs structured JSON response format", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toContain("JSON");
    expect(prompt).toContain("narrative_events");
    expect(prompt).toContain("xp_awards");
    expect(prompt).toContain("item_drops");
    expect(prompt).toContain("quest_updates");
    expect(prompt).toContain("npc_names");
    expect(prompt).toContain("zone_choice");
  });

  it("does NOT contain file paths or source code", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    // Should not reference real filesystem paths
    expect(prompt).not.toMatch(/\/home\//);
    expect(prompt).not.toMatch(/\/Users\//);
    expect(prompt).not.toMatch(/C:\\/);
    expect(prompt).not.toMatch(/\.claude\/projects\//);
    // Should not contain import/require statements
    expect(prompt).not.toMatch(/^import\s/m);
    expect(prompt).not.toMatch(/require\(/);
  });

  it("includes pending actions when provided", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, [
      "Player reached level 5",
      "New zone unlock eligible",
    ]);

    expect(prompt).toContain("Player reached level 5");
    expect(prompt).toContain("New zone unlock eligible");
  });

  it("includes encounter instruction", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toContain("encounter");
  });

  it("instructs never to reference real file paths or project names", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const events = makeMockEvents();
    const prompt = buildPrompt(state, events, []);

    expect(prompt).toMatch(/never.*reference.*real.*file.*path/i);
  });
});
