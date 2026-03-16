import { describe, it, expect } from "vitest";
import { awardXP, calculateCritChance, rollCrit, rollDrop, checkCritStreak, applyAscension } from "../progression.js";
import { createStarterState, CharacterClass, ItemRarity } from "@crit-commit/shared";

describe("awardXP", () => {
  it("adds XP to character", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const updated = awardXP(state, 50);
    expect(updated.character.xp).toBe(50);
  });

  it("triggers level up when XP exceeds threshold", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const updated = awardXP(state, state.character.xpToNext + 1);
    expect(updated.character.level).toBe(2);
  });

  it("caps at level 20", () => {
    const state = createStarterState("Hero", CharacterClass.Scout);
    state.character.level = 20;
    const updated = awardXP(state, 9999);
    expect(updated.character.level).toBe(20);
  });
});

describe("calculateCritChance", () => {
  it("returns base chance at level 1", () => {
    const state = createStarterState("Hero", CharacterClass.Battlemage);
    expect(calculateCritChance(state)).toBeCloseTo(0.05);
  });

  it("CharacterClass.Scout gets bonus crit chance", () => {
    const state = createStarterState("Hero", CharacterClass.Scout);
    expect(calculateCritChance(state)).toBeGreaterThan(0.05);
  });
});

describe("rollCrit", () => {
  it("returns true for 100% crit chance", () => {
    expect(rollCrit(1.0)).toBe(true);
  });

  it("returns false for 0% crit chance", () => {
    expect(rollCrit(0.0)).toBe(false);
  });
});

describe("rollDrop", () => {
  it("returns an item rarity or null", () => {
    const result = rollDrop(1.0); // 100% drop chance
    expect([ItemRarity.Common, ItemRarity.Uncommon, ItemRarity.Rare, ItemRarity.Legendary, null]).toContain(result);
  });

  it("returns null when drop chance is 0", () => {
    expect(rollDrop(0)).toBeNull();
  });
});

describe("checkCritStreak", () => {
  it("increments streak on crit", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const updated = checkCritStreak(state, true);
    expect(updated.critStreak).toBe(1);
  });

  it("resets streak on non-crit", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    state.critStreak = 3;
    const updated = checkCritStreak(state, false);
    expect(updated.critStreak).toBe(0);
  });
});

describe("applyAscension", () => {
  it("resets level to 1 and grants a star", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    state.character.level = 20;
    const updated = applyAscension(state);
    expect(updated.character.level).toBe(1);
    expect((updated.character as { ascensionStars?: number }).ascensionStars).toBe(1);
  });

  it("keeps zones unlocked", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    state.character.level = 20;
    state.zones.push({ id: "z1", name: "Test Zone", description: "", theme: "test", isActive: true, isUnlocked: true, level: 1, npcs: [], encounters: [], unlockedAt: "" });
    const updated = applyAscension(state);
    expect(updated.zones).toHaveLength(2);
  });
});