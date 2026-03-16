import { describe, it, expect } from "vitest";
import { parseGameEngineResponse } from "../response-parser.js";

describe("parseGameEngineResponse", () => {
  it("parses a valid JSON response into a typed GameStateUpdate", () => {
    const raw = JSON.stringify({
      narrative_events: [
        {
          type: "encounter",
          title: "A Wild Bug Appears",
          description: "You stumble upon a corrupted memory fragment.",
        },
      ],
      xp_awards: [{ source: "editing", amount: 25 }],
      item_drops: [
        {
          name: "Debug Lens",
          rarity: "uncommon",
          type: "gear",
          description: "See through obfuscation.",
        },
      ],
      quest_updates: [
        {
          questId: "q1",
          action: "progress",
          progress: 2,
        },
      ],
      npc_names: [
        {
          name: "Obi-Wan Debuggi",
          class: "architect",
          description: "A wise debugging master.",
        },
      ],
      encounter: {
        type: "combat",
        name: "Memory Leak",
        description: "A dangerous memory leak threatens the system.",
        difficulty: 3,
        xpReward: 50,
      },
      zone_choice: null,
    });

    const result = parseGameEngineResponse(raw);

    expect(result.narrative_events).toHaveLength(1);
    expect(result.narrative_events[0].type).toBe("encounter");
    expect(result.narrative_events[0].title).toBe("A Wild Bug Appears");
    expect(result.xp_awards).toHaveLength(1);
    expect(result.xp_awards[0].amount).toBe(25);
    expect(result.item_drops).toHaveLength(1);
    expect(result.item_drops[0].name).toBe("Debug Lens");
    expect(result.quest_updates).toHaveLength(1);
    expect(result.quest_updates[0].questId).toBe("q1");
    expect(result.npc_names).toHaveLength(1);
    expect(result.npc_names[0].name).toBe("Obi-Wan Debuggi");
    expect(result.encounter).not.toBeNull();
    expect(result.encounter!.name).toBe("Memory Leak");
    expect(result.zone_choice).toBeNull();
  });

  it("defaults missing fields to empty arrays and null", () => {
    const raw = JSON.stringify({});
    const result = parseGameEngineResponse(raw);

    expect(result.narrative_events).toEqual([]);
    expect(result.xp_awards).toEqual([]);
    expect(result.item_drops).toEqual([]);
    expect(result.quest_updates).toEqual([]);
    expect(result.npc_names).toEqual([]);
    expect(result.encounter).toBeNull();
    expect(result.zone_choice).toBeNull();
  });

  it("returns empty update on malformed JSON (no crash)", () => {
    const result = parseGameEngineResponse("not valid json {{{");

    expect(result.narrative_events).toEqual([]);
    expect(result.xp_awards).toEqual([]);
    expect(result.item_drops).toEqual([]);
    expect(result.quest_updates).toEqual([]);
    expect(result.npc_names).toEqual([]);
    expect(result.encounter).toBeNull();
    expect(result.zone_choice).toBeNull();
  });

  it("extracts narrative events with correct types", () => {
    const raw = JSON.stringify({
      narrative_events: [
        { type: "crit", title: "Critical Hit!", description: "Massive damage." },
        {
          type: "level_up",
          title: "Level Up!",
          description: "You reached level 5.",
        },
        {
          type: "story",
          title: "The Plot Thickens",
          description: "A mysterious figure appears.",
        },
      ],
    });

    const result = parseGameEngineResponse(raw);

    expect(result.narrative_events).toHaveLength(3);
    expect(result.narrative_events[0].type).toBe("crit");
    expect(result.narrative_events[1].type).toBe("level_up");
    expect(result.narrative_events[2].type).toBe("story");
  });

  it("handles partial fields gracefully", () => {
    const raw = JSON.stringify({
      narrative_events: [
        { type: "story", title: "Hello", description: "World" },
      ],
      xp_awards: [{ source: "coding", amount: 10 }],
      // Missing other fields
    });

    const result = parseGameEngineResponse(raw);

    expect(result.narrative_events).toHaveLength(1);
    expect(result.xp_awards).toHaveLength(1);
    expect(result.item_drops).toEqual([]);
    expect(result.quest_updates).toEqual([]);
    expect(result.npc_names).toEqual([]);
    expect(result.encounter).toBeNull();
    expect(result.zone_choice).toBeNull();
  });

  it("handles non-array values for array fields gracefully", () => {
    const raw = JSON.stringify({
      narrative_events: "not an array",
      xp_awards: 42,
    });

    const result = parseGameEngineResponse(raw);

    expect(result.narrative_events).toEqual([]);
    expect(result.xp_awards).toEqual([]);
  });

  it("extracts JSON from markdown code fences", () => {
    const raw = '```json\n{"narrative_events": [{"type": "story", "title": "Test", "description": "Wrapped in fences"}], "xp_awards": [{"source": "test", "amount": 5}]}\n```';

    const result = parseGameEngineResponse(raw);

    expect(result.narrative_events).toHaveLength(1);
    expect(result.narrative_events[0].title).toBe("Test");
    expect(result.xp_awards[0].amount).toBe(5);
  });
});
