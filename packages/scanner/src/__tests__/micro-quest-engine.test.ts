import { describe, it, expect } from "vitest";
import { MicroQuestEngine } from "../micro-quest-engine.js";
import { createStarterState, CharacterClass } from "@crit-commit/shared";

describe("MicroQuestEngine", () => {
  it("generates 'Edit 5 files' quest after 5 edits", () => {
    const engine = new MicroQuestEngine();
    const state = createStarterState("Test", CharacterClass.Architect);
    const events = {
      edits: 5,
      newFiles: 0,
      deletions: 0,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      grepSearches: 0,
      globSearches: 0,
      fileReads: 0,
      gitCommits: 0,
      gitPushes: 0,
      gitPulls: 0,
      buildAttempts: 0,
      buildSuccesses: 0,
      buildFailures: 0,
      subAgentsSpawned: 0,
      subAgentsCompleted: 0,
      complexPrompts: 0,
      languagesDetected: [],
      frameworksDetected: [],
      sessionDurationMinutes: 30,
      toolUsageCounts: {}
    };
    const quests = engine.evaluate(state, events);
    expect(quests.some(q => q.title.includes("Edit"))).toBe(true);
  });

  it("limits to MAX_MICRO_QUESTS active quests", () => {
    const engine = new MicroQuestEngine();
    const state = createStarterState("Test", CharacterClass.Scout);
    const events = {
      edits: 10,
      newFiles: 5,
      deletions: 0,
      testsRun: 0,
      testsPassed: 5,
      testsFailed: 0,
      grepSearches: 5,
      globSearches: 0,
      fileReads: 5,
      gitCommits: 1,
      gitPushes: 1,
      gitPulls: 0,
      buildAttempts: 0,
      buildSuccesses: 0,
      buildFailures: 0,
      subAgentsSpawned: 1,
      subAgentsCompleted: 1,
      complexPrompts: 0,
      languagesDetected: [],
      frameworksDetected: [],
      sessionDurationMinutes: 60,
      toolUsageCounts: {}
    };
    const quests = engine.evaluate(state, events);
    expect(quests.length).toBeLessThanOrEqual(3);
  });

  it("tracks new language for Foreign Lands quest", () => {
    const engine = new MicroQuestEngine();
    engine.addDetectedLanguage(".ts");
    engine.addDetectedLanguage(".py"); // new language
    expect(engine.hasNewLanguage()).toBe(true);
  });
});