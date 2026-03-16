// Scanner Orchestrator — wires all scanner components together
// Manages the lifecycle of file watching, event batching, game engine calls, and WebSocket updates

import type {
  GameState,
  BatchedEvents,
  ClientMessage,
  PlayerSettings,
} from "@crit-commit/shared";
import {
  buildPrompt,
  parseGameEngineResponse,
  invokeClaudeEngine,
  awardXP,
  checkCritStreak,
  rollCrit,
} from "@crit-commit/game-engine";
import { StateManager } from "./state-manager.js";
import { FileWatcher } from "./file-watcher.js";
import { EventAccumulator } from "./event-accumulator.js";
import { MicroQuestEngine } from "./micro-quest-engine.js";
import { GameServer } from "./server.js";
import { parseJsonlLine } from "./jsonl-parser.js";

export interface OrchestratorConfig {
  basePath?: string;
  port: number;
  batchIntervalMinutes: number;
  staticDir: string;
}

export class Orchestrator {
  private config: OrchestratorConfig;
  private stateManager: StateManager;
  private fileWatcher: FileWatcher | null = null;
  private accumulator: EventAccumulator;
  private microQuestEngine: MicroQuestEngine;
  private server: GameServer | null = null;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private gameState: GameState | null = null;
  private settings: PlayerSettings | null = null;
  private running = false;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.stateManager = new StateManager(config.basePath);
    this.accumulator = new EventAccumulator();
    this.microQuestEngine = new MicroQuestEngine();
  }

  /**
   * Start the orchestrator: load state, start watcher, start server, begin batch timer
   */
  async start(): Promise<void> {
    if (this.running) return;

    // Initialize state manager and load persisted state
    this.stateManager.init();
    this.gameState = this.stateManager.loadState();
    this.settings = this.stateManager.loadSettings();

    if (!this.gameState || !this.settings) {
      throw new Error(
        "No game state or settings found. Run first-run setup first.",
      );
    }

    // Restore any pending events from a previous crash
    const pendingEvents = this.stateManager.loadPendingEvents();
    for (const event of pendingEvents) {
      this.accumulator.addEvent(
        event as Parameters<EventAccumulator["addEvent"]>[0],
      );
    }
    this.stateManager.clearPendingEvents();

    // Create file watcher with configured watch paths
    const watchPaths = this.settings.watchPaths;
    this.fileWatcher = new FileWatcher(watchPaths, (line, sessionId) => {
      this.handleJsonlLine(line, sessionId);
    });

    // Create and start game server
    this.server = new GameServer(this.config.staticDir, this.settings);
    await this.server.start(this.config.port, (message) => {
      this.handleClientMessage(message);
    });

    // Push initial state to any connecting clients
    if (this.gameState) {
      this.server.updateGameState(this.gameState);
    }

    // Start batch processing timer
    const intervalMs = this.config.batchIntervalMinutes * 60 * 1000;
    this.batchTimer = setInterval(() => {
      void this.processBatch();
    }, intervalMs);

    this.running = true;

    // Push status to connected clients
    this.server.pushUpdate({
      type: "status",
      status: "scanning",
      message: "Crit Commit is watching your coding activity...",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop the orchestrator: save state, close watcher, close server
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    // Stop batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Save current state
    if (this.gameState) {
      this.stateManager.saveState(this.gameState);
    }

    // Close file watcher
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }

    // Close server
    if (this.server) {
      await this.server.stop();
      this.server = null;
    }

    this.running = false;
  }

  /**
   * Handle a new JSONL line from the file watcher
   */
  private handleJsonlLine(line: string, sessionId: string): void {
    const events = parseJsonlLine(line);
    for (const event of events) {
      this.accumulator.addEvent({
        ...event,
        sessionId,
      } as Parameters<EventAccumulator["addEvent"]>[0]);

      // Track languages for micro-quest engine via tool_use events with extensions
      if ("fileExtension" in event && event.fileExtension) {
        this.microQuestEngine.addDetectedLanguage(
          event.fileExtension as string,
        );
      }
    }
  }

  /**
   * Handle a client WebSocket message
   */
  private handleClientMessage(message: ClientMessage): void {
    switch (message.type) {
      case "request_state":
        if (this.gameState && this.server) {
          this.server.updateGameState(this.gameState);
        }
        break;

      case "update_settings":
        if (this.settings) {
          this.settings = { ...this.settings, ...message.settings };
          this.stateManager.saveSettings(this.settings);
        }
        break;

      case "ping":
        // Respond with status
        if (this.server) {
          this.server.pushUpdate({
            type: "status",
            status: "connected",
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        // Other message types (stackjack, equip, zone_choice, etc.)
        // will be handled in future tasks
        break;
    }
  }

  /**
   * Process a batch: flush accumulator, generate quests, invoke Claude, apply updates
   */
  private async processBatch(): Promise<void> {
    if (!this.gameState || !this.server) return;

    const flushResult = this.accumulator.flush(
      this.config.batchIntervalMinutes,
    );

    // Skip if no events in this batch
    if (
      flushResult.totalEvents.edits === 0 &&
      flushResult.totalEvents.newFiles === 0 &&
      flushResult.totalEvents.grepSearches === 0 &&
      flushResult.totalEvents.globSearches === 0 &&
      flushResult.totalEvents.fileReads === 0
    ) {
      return;
    }

    // Notify clients we're processing
    this.server.pushUpdate({
      type: "status",
      status: "processing_batch",
      message: "Processing coding activity...",
      timestamp: new Date().toISOString(),
    });

    // Generate micro-quests from rules engine
    const microQuests = this.microQuestEngine.evaluate(
      this.gameState,
      flushResult.totalEvents,
    );

    // Add micro-quests to game state
    if (microQuests.length > 0) {
      this.gameState = {
        ...this.gameState,
        activeQuests: [...this.gameState.activeQuests, ...microQuests],
      };
    }

    // Convert flush result to BatchedEvents for prompt builder
    const batchedEvents: BatchedEvents = {
      timestamp: flushResult.timestamp,
      batchId: flushResult.batchId,
      totalEvents: flushResult.totalEvents,
      terminals: flushResult.terminals,
      terminalsActive: flushResult.terminalsActive.length,
      batchIntervalMinutes: flushResult.batchIntervalMinutes,
      isFirstBatchOfDay: flushResult.isFirstBatchOfDay,
      critEligibleEvents: flushResult.critEligibleEvents,
      milestoneEvents: flushResult.milestoneEvents,
      playerId: flushResult.playerId,
      playerTimezone: flushResult.playerTimezone,
    };

    // Build prompt and invoke Claude game engine
    const pendingActions: string[] = [];
    if (microQuests.length > 0) {
      pendingActions.push(
        `${microQuests.length} new micro-quest(s) generated from coding activity`,
      );
    }

    const prompt = buildPrompt(this.gameState, batchedEvents, pendingActions);
    const rawResponse = await invokeClaudeEngine(prompt);

    if (rawResponse) {
      const update = parseGameEngineResponse(rawResponse);

      // Apply XP awards
      for (const award of update.xp_awards) {
        // Roll for crit on each XP award
        const isCrit = rollCrit(this.gameState.character.critChance);
        const xpAmount = isCrit ? award.amount * 2 : award.amount;
        this.gameState = awardXP(this.gameState, xpAmount);
        this.gameState = checkCritStreak(this.gameState, isCrit);

        if (isCrit && this.server) {
          this.server.pushUpdate({
            type: "crit_trigger",
            critDescription: `Critical hit on "${award.source}"!`,
            xpGained: xpAmount,
            critStreak: this.gameState.critStreak,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Push narrative events to clients
      if (update.narrative_events.length > 0 && this.server) {
        this.server.pushUpdate({
          type: "event_feed",
          events: update.narrative_events.map((ne) => ({
            id: `ne-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            type: ne.type as "encounter" | "quest" | "crit" | "level_up" | "zone_unlock" | "story",
            title: ne.title,
            description: ne.description,
            timestamp: new Date().toISOString(),
            isRead: false,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // Append to history
      this.stateManager.appendHistory({
        type: "batch_processed",
        timestamp: new Date().toISOString(),
        batchId: batchedEvents.batchId,
        xpAwarded: update.xp_awards.reduce((sum, a) => sum + a.amount, 0),
        questsGenerated: microQuests.length,
        narrativeEvents: update.narrative_events.length,
      });
    }

    // Save updated state
    this.stateManager.saveState(this.gameState);

    // Push updated game state to all clients
    this.server.updateGameState(this.gameState);

    // Return to scanning status
    this.server.pushUpdate({
      type: "status",
      status: "scanning",
      message: "Watching for coding activity...",
      timestamp: new Date().toISOString(),
    });
  }

  /** Check if the orchestrator is currently running */
  isRunning(): boolean {
    return this.running;
  }

  /** Get the current game state (for CLI status) */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /** Get the state manager (for external access) */
  getStateManager(): StateManager {
    return this.stateManager;
  }
}
