import { describe, it, expect } from "vitest";
import { createStarterState } from "../data/starter-state.js";
import { CharacterClass } from "../types/game-state.js";
import { CURRENT_SCHEMA_VERSION, ZONES } from "../constants.js";

describe("createStarterState", () => {
  const playerName = "TestPlayer";
  const testClass = CharacterClass.Architect;

  it("creates valid game state with correct schema version", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state).toHaveProperty("createdAt");
    expect(state).toHaveProperty("updatedAt");
    expect(state.createdAt).toBeTruthy();
    expect(state.updatedAt).toBeTruthy();
  });

  it("creates character with correct name, class, and level 1", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.character.name).toBe(playerName);
    expect(state.character.class).toBe(testClass);
    expect(state.character.level).toBe(1);
    expect(state.character.xp).toBe(0);
    expect(state.character.xpToNext).toBeGreaterThan(0);
    expect(state.character.critChance).toBeGreaterThan(0);
    expect(state.character.critMultiplier).toBeGreaterThan(1);
    expect(state.character).toHaveProperty("createdAt");
  });

  it("creates base camp zone as the only unlocked zone", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.zones).toHaveLength(1);
    expect(state.zones[0].id).toBe(ZONES.BASE_CAMP.id);
    expect(state.zones[0].name).toBe(ZONES.BASE_CAMP.name);
    expect(state.zones[0].isUnlocked).toBe(true);
    expect(state.zones[0].isActive).toBe(true);
    expect(state.zones[0].level).toBe(1);
    expect(state.currentZoneId).toBe(ZONES.BASE_CAMP.id);
    expect(state.stats.zonesUnlocked).toBe(1);
  });

  it("creates starter stackjack deck with 6 cards", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.cardCollection).toHaveLength(6);

    // Check that we have the expected starter cards
    const cardIds = state.cardCollection.map(card => card.id);
    expect(cardIds).toContain("plus-1");
    expect(cardIds).toContain("plus-2");
    expect(cardIds).toContain("minus-1");
    expect(cardIds).toContain("minus-2");
    expect(cardIds).toContain("flip-1");
    expect(cardIds).toContain("flip-2");
  });

  it("creates base camp with NPCs", () => {
    const state = createStarterState(playerName, testClass);

    const baseCamp = state.zones[0];
    expect(baseCamp.npcs).toHaveLength(2);

    // Check that the NPCs exist and have correct properties
    const npcNames = baseCamp.npcs.map(npc => npc.name);
    expect(npcNames).toContain("Pixel Pete");
    expect(npcNames).toContain("Byte the Barista");

    baseCamp.npcs.forEach(npc => {
      expect(npc.difficulty).toBe("easy");
      expect(npc.zoneId).toBe(ZONES.BASE_CAMP.id);
      expect(npc.isUnlocked).toBe(true);
      expect(npc.deck).toHaveLength(4); // Easy NPCs have 4-card decks
      expect(npc.wins).toBe(0);
      expect(npc.losses).toBe(0);
    });
  });

  it("initializes empty collections", () => {
    const state = createStarterState(playerName, testClass);

    // Empty party, quests, inventory
    expect(state.party).toEqual([]);
    expect(state.activeQuests).toEqual([]);
    expect(state.completedQuests).toEqual([]);
    expect(state.availableQuests).toEqual([]);
    expect(state.inventory).toEqual([]);
    expect(state.materiaCollection).toEqual([]);
    expect(state.equippedMateria).toEqual([]);

    // Empty equipped gear
    expect(state.equippedGear.weapon).toBeUndefined();
    expect(state.equippedGear.armor).toBeUndefined();
    expect(state.equippedGear.accessory).toBeUndefined();
  });

  it("initializes base stats correctly", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.stats.totalXP).toBe(0);
    expect(state.stats.totalCrits).toBe(0);
    expect(state.stats.maxCritStreak).toBe(0);
    expect(state.stats.questsCompleted).toBe(0);
    expect(state.stats.stackjackWins).toBe(0);
    expect(state.stats.stackjackLosses).toBe(0);
    expect(state.stats.sessionCount).toBe(0);
    expect(state.stats.totalPlayTime).toBe(0);
  });

  it("initializes inactive stackjack state", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.stackjackState.isActive).toBe(false);
    expect(state.stackjackState.playerTotal).toBe(0);
    expect(state.stackjackState.opponentTotal).toBe(0);
    expect(state.stackjackState.gameOver).toBe(false);
    expect(state.stackjackState.currentRound).toBe(0);
    expect(state.stackjackState.playerRoundsWon).toBe(0);
    expect(state.stackjackState.opponentRoundsWon).toBe(0);
  });

  it("initializes narrative state", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.narrative.currentStoryArc).toBe("arrival");
    expect(state.narrative.storyArcs).toHaveProperty("arrival");
    expect(state.narrative.recentEvents).toEqual([]);
    expect(state.narrative.encounterHistory).toEqual([]);
    expect(state.narrative.lastClaudeCall).toBe("");
  });

  it("initializes session state", () => {
    const state = createStarterState(playerName, testClass);

    expect(state.isInSession).toBe(false);
    expect(state.critStreak).toBe(0);
    expect(state.sessionStartTime).toBeUndefined();
    expect(state.lastBatchTime).toBeUndefined();
  });

  it("works with all character classes", () => {
    const classes = [
      CharacterClass.Architect,
      CharacterClass.Scout,
      CharacterClass.Artificer,
      CharacterClass.Battlemage,
    ];

    classes.forEach(characterClass => {
      const state = createStarterState("TestPlayer", characterClass);
      expect(state.character.class).toBe(characterClass);
      expect(state.character.level).toBe(1);
      // All other properties should be the same regardless of class
      expect(state.zones).toHaveLength(1);
      expect(state.cardCollection).toHaveLength(6);
    });
  });
});