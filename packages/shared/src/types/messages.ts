// WebSocket Message Types for Client-Server Communication

import type { GameState, StackjackCard, StackjackNPC, NarrativeEvent } from "./game-state.js";

// =====================
// Player Settings
// =====================

export interface PlayerSettings {
  // Multi-user JSONL directory monitoring
  watchPaths: string[];

  // Batch processing configuration
  batchIntervalMinutes: number;

  // Display preferences
  showAnimations: boolean;
  soundEnabled: boolean;
  showNotifications: boolean;

  // Game preferences
  autoEquipBetterGear: boolean;
  skipTutorial: boolean;
  compactUI: boolean;

  // Advanced settings
  debugMode: boolean;
  maxHistoryEvents: number;
}

// =====================
// Stackjack Types
// =====================

export interface StackjackMatchState {
  isActive: boolean;
  opponentId?: string;
  playerTotal: number;
  opponentTotal: number;
  playerRoundsWon: number;
  opponentRoundsWon: number;
  currentRound: number;
  isPlayerTurn: boolean;
  hasPlayerStood: boolean;
  hasOpponentStood: boolean;
  gamePhase: "setup" | "playing" | "round_end" | "match_end";
  lastMainCard?: number;
  canPlaySideCard: boolean;
  playerSideCardsRemaining: number;
}

export type StackjackAction =
  | { type: "end_turn" }
  | { type: "play_side_card"; cardId: string; flipChoice?: "plus" | "minus" }
  | { type: "stand" }
  | { type: "start_match"; opponentId: string; sideDeck: string[] }
  | { type: "rematch" }
  | { type: "quit_match" };

// =====================
// Server Messages (Scanner -> Web UI)
// =====================

export type ServerMessage =
  | {
      type: "state_update";
      gameState: GameState;
      timestamp: string;
    }
  | {
      type: "event_feed";
      events: NarrativeEvent[];
      timestamp: string;
    }
  | {
      type: "crit_trigger";
      critDescription: string;
      xpGained: number;
      critStreak: number;
      timestamp: string;
    }
  | {
      type: "encounter_update";
      encounterId: string;
      title: string;
      description: string;
      choices?: Array<{
        id: string;
        text: string;
        disabled?: boolean;
      }>;
      timestamp: string;
    }
  | {
      type: "status";
      status: "connected" | "disconnected" | "game_engine_offline" | "scanning" | "processing_batch";
      message?: string;
      timestamp: string;
    }
  | {
      type: "stackjack_update";
      matchState: StackjackMatchState;
      playerCards: StackjackCard[];
      availableSideCards: StackjackCard[];
      lastAction?: string;
      roundResult?: {
        winner: "player" | "opponent" | "tie";
        playerScore: number;
        opponentScore: number;
        description: string;
      };
      matchResult?: {
        winner: "player" | "opponent";
        xpGained?: number;
        cardReward?: StackjackCard;
      };
      timestamp: string;
    }
  | {
      type: "error";
      error: string;
      context?: string;
      timestamp: string;
    };

// =====================
// Client Messages (Web UI -> Scanner)
// =====================

export type ClientMessage =
  | {
      type: "equip_materia";
      materiaId: string;
      slot?: number;
    }
  | {
      type: "unequip_materia";
      materiaId: string;
    }
  | {
      type: "equip_gear";
      itemId: string;
      slot: "weapon" | "armor" | "accessory";
    }
  | {
      type: "unequip_gear";
      slot: "weapon" | "armor" | "accessory";
    }
  | {
      type: "zone_choice";
      zoneId: string;
      reason?: string;
    }
  | {
      type: "update_settings";
      settings: Partial<PlayerSettings>;
    }
  | {
      type: "stackjack_action";
      action: StackjackAction;
    }
  | {
      type: "request_state";
      includeHistory?: boolean;
    }
  | {
      type: "encounter_choice";
      encounterId: string;
      choiceId: string;
    }
  | {
      type: "quest_action";
      questId: string;
      action: "accept" | "abandon" | "view_details";
    }
  | {
      type: "use_item";
      itemId: string;
      target?: string;
    }
  | {
      type: "ping";
      timestamp: string;
    };

// =====================
// Connection Types
// =====================

export interface ConnectionInfo {
  clientId: string;
  connectedAt: string;
  lastActivity: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ServerStatus {
  isRunning: boolean;
  gameEngineStatus: "online" | "offline" | "busy";
  activeConnections: number;
  lastBatchProcessed?: string;
  uptime: number;
  version: string;
}

// =====================
// API Response Types
// =====================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Settings endpoints
export type GetSettingsResponse = APIResponse<PlayerSettings>;
export type UpdateSettingsResponse = APIResponse<PlayerSettings>;

// Game state endpoints
export type GetGameStateResponse = APIResponse<GameState>;
export type GetStatusResponse = APIResponse<ServerStatus>;

// Stackjack endpoints
export type GetAvailableOpponentsResponse = APIResponse<StackjackNPC[]>;
export type StartMatchResponse = APIResponse<{ matchId: string }>;

// History endpoints
export interface HistoryEntry {
  timestamp: string;
  type: "xp_gained" | "level_up" | "item_found" | "quest_completed" | "crit" | "stackjack_win";
  description: string;
  metadata?: Record<string, unknown>;
}

export type GetHistoryResponse = APIResponse<HistoryEntry[]>;