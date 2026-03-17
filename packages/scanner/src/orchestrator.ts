// Scanner Orchestrator — wires all scanner components together
// Manages the lifecycle of file watching, event batching, game engine calls, and WebSocket updates

import type {
  GameState,
  BatchedEvents,
  ClientMessage,
  PlayerSettings,
  StackjackMatchState,
  StackjackCard,
  StackjackNPC,
  StackjackAction,
} from "@crit-commit/shared";
import { BASE_CAMP_NPCS } from "@crit-commit/shared";
import {
  buildPrompt,
  parseGameEngineResponse,
  invokeClaudeEngine,
  awardXP,
  checkCritStreak,
  rollCrit,
  StackjackMatch,
  npcTurn,
  applyZoneChoice,
  enforceZoneLimit,
} from "@crit-commit/game-engine";
import { StateManager } from "./state-manager.js";
import { FileWatcher } from "./file-watcher.js";
import { EventAccumulator } from "./event-accumulator.js";
import { MicroQuestEngine } from "./micro-quest-engine.js";
import { GameServer } from "./server.js";
import { parseJsonlLine } from "./jsonl-parser.js";
import fs from "node:fs";
import path from "node:path";

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
  private stackjackMatch: StackjackMatch | null = null;
  private currentOpponent: StackjackNPC | null = null;

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
    // eslint-disable-next-line no-console
    console.log(`[SCANNER] Watching ${watchPaths.length} path(s): ${watchPaths.join(", ")}`);
    this.fileWatcher = new FileWatcher(watchPaths, (line, sessionId) => {
      const events = parseJsonlLine(line);
      // eslint-disable-next-line no-console
      console.log(`[SCANNER] JSONL line from session ${sessionId.substring(0, 8)}... → ${events.length} events parsed`);
      if (events.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[SCANNER]   Events: ${events.map(e => `${e.type}${'toolName' in e ? ':' + e.toolName : ''}`).join(', ')}`);
      }
      this.handleJsonlLine(line, sessionId);
    });

    // Check for web-ui dist
    const webUiIndex = path.resolve(this.config.staticDir, "index.html");
    if (!fs.existsSync(webUiIndex)) {
      console.warn(
        `Warning: Web UI not found at ${this.config.staticDir}. Run "npm run build" in packages/web-ui to build it.`,
      );
    }

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
    // eslint-disable-next-line no-console
    console.log(`[SCANNER] Batch interval: ${this.config.batchIntervalMinutes} min (${intervalMs}ms)`);
    this.batchTimer = setInterval(() => {
      // eslint-disable-next-line no-console
      console.log(`[SCANNER] Batch timer fired — processing events...`);
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
    // eslint-disable-next-line no-console
    console.log(`[SCANNER] Client message received: ${message.type}`, JSON.stringify(message).substring(0, 200));
    switch (message.type) {
      case "request_state":
        if (this.gameState && this.server) {
          this.server.updateGameState(this.gameState);
        }
        break;

      case "update_settings":
        this.handleUpdateSettings(message.settings);
        break;

      case "stackjack_action":
        this.handleStackjackAction(message.action);
        break;

      case "zone_choice":
        this.handleZoneChoice(message.zoneId);
        break;

      case "ping":
        if (this.server) {
          this.server.pushUpdate({
            type: "status",
            status: "connected",
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        break;
    }
  }

  /**
   * Handle settings update: persist and dynamically update batch interval
   */
  private handleUpdateSettings(updates: Partial<PlayerSettings>): void {
    if (!this.settings) return;

    this.settings = { ...this.settings, ...updates };
    this.stateManager.saveSettings(this.settings);

    // Dynamically update batch timer if interval changed
    if (updates.batchIntervalMinutes !== undefined && this.batchTimer) {
      clearInterval(this.batchTimer);
      const intervalMs = this.settings.batchIntervalMinutes * 60 * 1000;
      this.batchTimer = setInterval(() => {
        void this.processBatch();
      }, intervalMs);
    }
  }

  /**
   * Handle Stackjack actions: route to match engine, push updates
   */
  private handleStackjackAction(action: StackjackAction): void {
    if (!this.gameState || !this.server) return;

    switch (action.type) {
      case "start_match":
        this.startStackjackMatch(action.opponentId, action.sideDeck);
        break;

      case "end_turn":
        if (this.stackjackMatch) {
          this.stackjackMatch.drawMainDeck();
          this.stackjackMatch.endTurn();
          this.processStackjackNPCTurn();
          this.pushStackjackUpdate("Player drew and ended turn");
        }
        break;

      case "play_side_card":
        if (this.stackjackMatch) {
          this.stackjackMatch.playCard(action.cardId, action.flipChoice);
          this.pushStackjackUpdate(`Played card ${action.cardId}`);
        }
        break;

      case "stand":
        if (this.stackjackMatch) {
          this.stackjackMatch.stand();
          this.processStackjackNPCTurn();
          this.pushStackjackUpdate("Player stood");
        }
        break;

      case "quit_match":
        this.stackjackMatch = null;
        this.currentOpponent = null;
        this.pushStackjackUpdate("Match abandoned");
        break;

      case "rematch":
        if (this.currentOpponent) {
          this.startStackjackMatch(this.currentOpponent.id, []);
        }
        break;
    }
  }

  /**
   * Start a new Stackjack match against an NPC
   */
  private startStackjackMatch(opponentId: string, sideDeckIds: string[]): void {
    if (!this.gameState || !this.server) return;

    // Find opponent NPC from base camp NPCs and zone NPCs
    const allNPCs: StackjackNPC[] = [
      ...BASE_CAMP_NPCS,
      ...this.gameState.zones.flatMap(z => z.npcs),
    ];
    const opponent = allNPCs.find(npc => npc.id === opponentId);
    if (!opponent) return;

    // Build player side deck from card collection
    const playerSideDeck: StackjackCard[] = sideDeckIds
      .map(id => this.gameState!.cardCollection.find(c => c.id === id))
      .filter((c): c is StackjackCard => c !== undefined)
      .slice(0, 4);

    this.currentOpponent = opponent;
    this.stackjackMatch = new StackjackMatch();
    this.stackjackMatch.startMatch(playerSideDeck, opponent.deck);

    this.pushStackjackUpdate(`Match started vs ${opponent.name}`);
  }

  /**
   * Process NPC turn after player action
   */
  private processStackjackNPCTurn(): void {
    if (!this.stackjackMatch || !this.currentOpponent) return;

    const state = this.stackjackMatch.getState();
    if (state.gameOver || state.isPlayerTurn) return;

    // Build the internal StackjackMatchState expected by npcTurn
    const internalMatchState = {
      playerTotal: state.playerTotal,
      opponentTotal: state.opponentTotal,
      playerSideDeck: state.playerSideDeck,
      opponentSideDeck: state.opponentSideDeck,
      mainDeckLastDraw: null as number | null,
      opponentLastDraw: null as number | null,
      mainDrawHistory: [] as number[],
      isPlayerTurn: state.isPlayerTurn,
      critNextCard: false,
    };

    const npcAction = npcTurn(internalMatchState, this.currentOpponent.difficulty, state.opponentSideDeck);

    switch (npcAction.action) {
      case "end_turn":
        this.stackjackMatch.drawMainDeck();
        this.stackjackMatch.endTurn();
        break;
      case "stand":
        this.stackjackMatch.stand();
        break;
      case "play_card":
        if (npcAction.cardId) {
          this.stackjackMatch.playCard(npcAction.cardId, npcAction.flipChoice);
        }
        break;
    }

    // Check if match ended and apply rewards
    const afterState = this.stackjackMatch.getState();
    if (afterState.gameOver && this.gameState) {
      this.applyStackjackRewards(afterState.winner === "player");
    }
  }

  /**
   * Push current Stackjack state to WebSocket clients
   */
  private pushStackjackUpdate(lastAction: string): void {
    if (!this.server || !this.stackjackMatch) return;

    const state = this.stackjackMatch.getState();
    const matchState: StackjackMatchState = {
      isActive: state.isActive,
      opponentId: this.currentOpponent?.id,
      playerTotal: state.playerTotal,
      opponentTotal: state.opponentTotal,
      playerRoundsWon: state.playerRoundsWon,
      opponentRoundsWon: state.opponentRoundsWon,
      currentRound: state.currentRound,
      isPlayerTurn: state.isPlayerTurn,
      hasPlayerStood: state.hasPlayerStood,
      hasOpponentStood: state.hasOpponentStood,
      gamePhase: state.gameOver ? "match_end" : "playing",
      canPlaySideCard: state.playerSideDeck.length > 0,
      playerSideCardsRemaining: state.playerSideDeck.length,
    };

    this.server.pushUpdate({
      type: "stackjack_update",
      matchState,
      playerCards: state.playerCards,
      availableSideCards: state.playerSideDeck,
      lastAction,
      matchResult: state.gameOver ? {
        winner: state.winner || "opponent",
        xpGained: state.winner === "player" ? 50 : 10,
      } : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Apply XP/rewards after a Stackjack match ends
   */
  private applyStackjackRewards(playerWon: boolean): void {
    if (!this.gameState) return;

    const xp = playerWon ? 50 : 10;
    this.gameState = awardXP(this.gameState, xp);
    this.gameState = {
      ...this.gameState,
      stats: {
        ...this.gameState.stats,
        stackjackWins: this.gameState.stats.stackjackWins + (playerWon ? 1 : 0),
        stackjackLosses: this.gameState.stats.stackjackLosses + (playerWon ? 0 : 1),
      },
      stackjackState: {
        ...this.gameState.stackjackState,
        isActive: false,
        gameOver: true,
        winner: playerWon ? "player" : "opponent",
      },
    };

    this.stateManager.saveState(this.gameState);
    this.server?.updateGameState(this.gameState);
  }

  /**
   * Handle zone choice: apply via ZoneManager, save state, push update
   */
  private handleZoneChoice(zoneId: string): void {
    if (!this.gameState || !this.server) return;

    // The zoneId from the client corresponds to a pending choice identifier
    // Zone choices come from Claude engine as pending narrative events
    // For now, create a zone from the choice data
    // The zone details would typically come from pendingChoices in the narrative
    const pendingChoices = (this.gameState.narrative as unknown as Record<string, unknown>).pendingChoices as Array<{
      zoneId: string;
      name: string;
      description: string;
      theme: string;
      modifier: string;
      modifierValue: number;
    }> | undefined;

    const choice = pendingChoices?.find(c => c.zoneId === zoneId);
    if (!choice) return;

    // Apply zone choice
    this.gameState = applyZoneChoice(this.gameState, {
      name: choice.name,
      description: choice.description,
      theme: choice.theme,
      modifier: choice.modifier,
      modifierValue: choice.modifierValue,
    });

    // Enforce zone limit
    this.gameState = enforceZoneLimit(this.gameState);

    // Clear pending choices from narrative
    this.gameState = {
      ...this.gameState,
      narrative: {
        ...this.gameState.narrative,
      },
    };
    // Remove pendingChoices using type assertion since it's a dynamic field
    delete (this.gameState.narrative as unknown as Record<string, unknown>).pendingChoices;

    // Save and push update
    this.stateManager.saveState(this.gameState);
    this.server.updateGameState(this.gameState);
  }

  /**
   * Process a batch: flush accumulator, generate quests, invoke Claude, apply updates
   */
  private async processBatch(): Promise<void> {
    if (!this.gameState || !this.server) return;

    const flushResult = this.accumulator.flush(
      this.config.batchIntervalMinutes,
    );

    // eslint-disable-next-line no-console
    console.log(`[SCANNER] Batch flush: edits=${flushResult.totalEvents.edits}, reads=${flushResult.totalEvents.fileReads}, searches=${flushResult.totalEvents.grepSearches}, newFiles=${flushResult.totalEvents.newFiles}`);

    // Skip if no events in this batch
    if (
      flushResult.totalEvents.edits === 0 &&
      flushResult.totalEvents.newFiles === 0 &&
      flushResult.totalEvents.grepSearches === 0 &&
      flushResult.totalEvents.globSearches === 0 &&
      flushResult.totalEvents.fileReads === 0
    ) {
      // eslint-disable-next-line no-console
      console.log(`[SCANNER] No events in batch — skipping Claude call`);
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

    // Cap the game state to essential fields to keep prompt under 10K chars
    const compactState = {
      character: {
        name: this.gameState.character.name,
        class: this.gameState.character.class,
        level: this.gameState.character.level,
        xp: this.gameState.character.xp,
        critChance: this.gameState.character.critChance,
        ascensionLevel: this.gameState.character.ascensionLevel || 0,
      },
      activeZone: this.gameState.zones?.find((z) => z.isActive)?.name || "Cloud City Base Camp",
      zonesUnlocked: this.gameState.stats?.zonesUnlocked || 1,
      partySize: Array.isArray(this.gameState.party) ? this.gameState.party.length : 0,
      stats: {
        totalCrits: this.gameState.stats?.totalCrits || 0,
        questsCompleted: this.gameState.stats?.questsCompleted || 0,
      },
    };

    const prompt = buildPrompt(compactState as unknown as typeof this.gameState, batchedEvents, pendingActions);
    // eslint-disable-next-line no-console
    console.log(`[SCANNER] Invoking Claude game engine (prompt: ${prompt.length} chars)...`);
    const rawResponse = await invokeClaudeEngine(prompt);
    // eslint-disable-next-line no-console
    console.log(`[SCANNER] Claude response: ${rawResponse ? rawResponse.substring(0, 200) + '...' : 'NULL (failed)'}`);

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
