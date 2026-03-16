import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "../state-manager.js";
import { createStarterState, CharacterClass } from "@crit-commit/shared";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("StateManager", () => {
  let tmpDir: string;
  let manager: StateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crit-commit-test-"));
    manager = new StateManager(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("creates directory structure on init", () => {
    manager.init();
    expect(fs.existsSync(path.join(tmpDir, "save"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "config"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "cache"))).toBe(true);
  });

  it("saves and loads game state", () => {
    manager.init();
    const state = createStarterState("TestHero", CharacterClass.Architect);
    manager.saveState(state);
    const loaded = manager.loadState();
    expect(loaded?.character.name).toBe("TestHero");
  });

  it("creates backup before saving", () => {
    manager.init();
    const state1 = createStarterState("Hero1", CharacterClass.Scout);
    manager.saveState(state1);
    const state2 = createStarterState("Hero2", CharacterClass.Scout);
    manager.saveState(state2);
    const backupPath = path.join(tmpDir, "save", "game-state.backup.json");
    expect(fs.existsSync(backupPath)).toBe(true);
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    expect(backup.character.name).toBe("Hero1");
  });

  it("falls back to backup on corruption", () => {
    manager.init();
    const state1 = createStarterState("ValidHero", CharacterClass.Architect);
    manager.saveState(state1);
    const state2 = createStarterState("CorruptedHero", CharacterClass.Scout);
    manager.saveState(state2); // This creates backup of state1
    // Corrupt main save
    fs.writeFileSync(path.join(tmpDir, "save", "game-state.json"), "CORRUPT{{{");
    const loaded = manager.loadState();
    expect(loaded?.character.name).toBe("ValidHero"); // from backup created before corruption write
  });

  it("appends to history.jsonl", () => {
    manager.init();
    manager.appendHistory({ type: "xp_gained", amount: 50, timestamp: new Date().toISOString() });
    manager.appendHistory({ type: "item_dropped", item: "Sword", timestamp: new Date().toISOString() });
    const historyPath = path.join(tmpDir, "save", "history.jsonl");
    const lines = fs.readFileSync(historyPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });
});