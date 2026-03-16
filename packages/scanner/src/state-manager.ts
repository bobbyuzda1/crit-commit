import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { GameState, PlayerSettings } from "@crit-commit/shared";

/**
 * StateManager handles persistent storage of game state, settings, and events.
 * Uses atomic writes with backup rotation for data integrity.
 */
export class StateManager {
  private readonly basePath: string;
  private readonly savePath: string;
  private readonly configPath: string;
  private readonly cachePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(os.homedir(), ".crit-commit");
    this.savePath = path.join(this.basePath, "save");
    this.configPath = path.join(this.basePath, "config");
    this.cachePath = path.join(this.basePath, "cache");
  }

  /**
   * Creates the directory structure for the game state storage
   */
  init(): void {
    fs.mkdirSync(this.savePath, { recursive: true });
    fs.mkdirSync(this.configPath, { recursive: true });
    fs.mkdirSync(this.cachePath, { recursive: true });
  }

  /**
   * Loads the current game state from disk.
   * Falls back to backup if main save is corrupted.
   */
  loadState(): GameState | null {
    const statePath = path.join(this.savePath, "game-state.json");
    const backupPath = path.join(this.savePath, "game-state.backup.json");

    // Try to load main save first
    try {
      if (fs.existsSync(statePath)) {
        const data = fs.readFileSync(statePath, "utf-8");
        return JSON.parse(data) as GameState;
      }
    } catch (error) {
      console.warn("Main save corrupted, attempting backup restore:", error);
    }

    // Fallback to backup
    try {
      if (fs.existsSync(backupPath)) {
        const data = fs.readFileSync(backupPath, "utf-8");
        return JSON.parse(data) as GameState;
      }
    } catch (error) {
      console.error("Both main save and backup are corrupted:", error);
    }

    return null;
  }

  /**
   * Saves the game state to disk with atomic write and backup rotation.
   * Creates a backup of the existing save before writing new data.
   */
  saveState(state: GameState): void {
    const statePath = path.join(this.savePath, "game-state.json");
    const backupPath = path.join(this.savePath, "game-state.backup.json");
    const tempPath = path.join(this.savePath, "game-state.tmp.json");

    // Create backup of existing save if it exists
    try {
      if (fs.existsSync(statePath)) {
        fs.copyFileSync(statePath, backupPath);
      }
    } catch (error) {
      console.warn("Failed to create backup:", error);
    }

    // Atomic write: write to temp file, then rename
    try {
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf-8");
      fs.renameSync(tempPath, statePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp file:", cleanupError);
      }
      throw error;
    }
  }

  /**
   * Appends an event to the history log (JSONL format)
   */
  appendHistory(event: object): void {
    const historyPath = path.join(this.savePath, "history.jsonl");
    const line = JSON.stringify(event) + "\n";

    try {
      fs.appendFileSync(historyPath, line, "utf-8");
    } catch (error) {
      console.error("Failed to append to history:", error);
    }
  }

  /**
   * Loads player settings from disk
   */
  loadSettings(): PlayerSettings | null {
    const settingsPath = path.join(this.configPath, "settings.json");

    try {
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, "utf-8");
        return JSON.parse(data) as PlayerSettings;
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }

    return null;
  }

  /**
   * Saves player settings to disk with atomic write
   */
  saveSettings(settings: PlayerSettings): void {
    const settingsPath = path.join(this.configPath, "settings.json");
    const tempPath = path.join(this.configPath, "settings.tmp.json");

    try {
      fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2), "utf-8");
      fs.renameSync(tempPath, settingsPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp settings file:", cleanupError);
      }
      throw error;
    }
  }

  /**
   * Saves pending events to disk for retry processing
   */
  savePendingEvents(events: object[]): void {
    const eventsPath = path.join(this.cachePath, "pending-events.json");
    const tempPath = path.join(this.cachePath, "pending-events.tmp.json");

    try {
      fs.writeFileSync(tempPath, JSON.stringify(events, null, 2), "utf-8");
      fs.renameSync(tempPath, eventsPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp events file:", cleanupError);
      }
      throw error;
    }
  }

  /**
   * Loads pending events from disk
   */
  loadPendingEvents(): object[] {
    const eventsPath = path.join(this.cachePath, "pending-events.json");

    try {
      if (fs.existsSync(eventsPath)) {
        const data = fs.readFileSync(eventsPath, "utf-8");
        return JSON.parse(data) as object[];
      }
    } catch (error) {
      console.error("Failed to load pending events:", error);
    }

    return [];
  }

  /**
   * Clears pending events from disk
   */
  clearPendingEvents(): void {
    const eventsPath = path.join(this.cachePath, "pending-events.json");

    try {
      if (fs.existsSync(eventsPath)) {
        fs.unlinkSync(eventsPath);
      }
    } catch (error) {
      console.error("Failed to clear pending events:", error);
    }
  }
}