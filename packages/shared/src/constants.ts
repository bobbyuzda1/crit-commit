// Game Constants and Configuration

import { CharacterClass } from "./types/game-state.js";

// =====================
// Schema Versioning
// =====================

export const CURRENT_SCHEMA_VERSION = 1;

// =====================
// File Paths
// =====================

export const PATHS = {
  // Main save directory
  SAVE_DIR: "~/.crit-commit/save/",
  CONFIG_DIR: "~/.crit-commit/config/",
  CACHE_DIR: "~/.crit-commit/cache/",

  // Save files
  GAME_STATE: "game-state.json",
  GAME_STATE_BACKUP: "game-state.backup.json",
  HISTORY_LOG: "history.jsonl",
  SESSION_LOG: "session-log.json",

  // Config files
  SETTINGS: "settings.json",
  CHARACTER: "character.json",

  // Cache files
  PENDING_EVENTS: "pending-events.json",

  // Claude JSONL directories
  CLAUDE_PROJECTS: "~/.claude/projects/",
} as const;

// =====================
// Game Balance
// =====================

export const BALANCE = {
  // Leveling curve (XP required per level)
  XP_CURVE: {
    1: 100, 2: 150, 3: 200, 4: 250, 5: 350,     // 1-5: First day (hook fast)
    6: 500, 7: 650, 8: 800, 9: 1000, 10: 1200,  // 6-10: ~1 week (steady dopamine)
    11: 1500, 12: 1800, 13: 2200, 14: 2600, 15: 3200, // 11-15: ~2-3 weeks (investment)
    16: 4000, 17: 5000, 18: 6500, 19: 8500, 20: 12000, // 16-20: ~1-2 months (achievements)
  },

  // XP Sources
  XP_REWARDS: {
    MICRO_QUEST: { min: 10, max: 25 },
    SESSION_QUEST: { min: 50, max: 150 },
    EPIC_QUEST: { min: 200, max: 500 },
    TESTS_PASSING: { min: 5, max: 30 },
    BUG_FIXED: { min: 30, max: 75 },
    GIT_PUSH: { min: 20, max: 40 },
    STACKJACK_WIN: { min: 15, max: 35 },
    NEW_ZONE: 100,
    DAILY_LOGIN: 25,
    RESTED_BONUS: 50,
  },

  // Crit System
  CRIT: {
    BASE_CHANCE: 0.05, // 5% base crit chance
    LEVEL_BONUS: 0.002, // +0.2% per level
    SCOUT_BONUS: 0.03, // Scout class gets +3%
    BASE_MULTIPLIER: 2.0,
    MAX_MULTIPLIER: 4.0,
    STREAK_THRESHOLD: 3, // 3 crits in session = streak
    STREAK_DURATION: 300000, // 5 minutes in milliseconds
  },

  // Drop Rates (conditional - when a drop occurs)
  DROP_RATES: {
    COMMON: 0.60,
    UNCOMMON: 0.25,
    RARE: 0.12,
    LEGENDARY: 0.03,
  },

  // Drop Chances (probability that any drop occurs)
  DROP_CHANCES: {
    ENCOUNTER: 0.50,
    QUEST_COMPLETION: 0.80,
    BOSS_DEFEAT: 1.00,
    CRIT_EVENT: 1.00,
  },

  // Materia System
  MATERIA: {
    MAX_LEVEL: 5,
    AP_CURVE: [0, 100, 250, 500, 1000, 2000], // AP required for levels 1-5
    MAX_EQUIPPED: 4,
  },

  // Stackjack
  STACKJACK: {
    TARGET_SCORE: 20,
    ROUNDS_TO_WIN: 3,
    SIDE_DECK_SIZE: 4,
    MAIN_DECK_CARDS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
} as const;

// =====================
// Class Configurations
// =====================

export const CLASS_CONFIG = {
  [CharacterClass.Architect]: {
    name: "Architect",
    description: "Backend/systems thinker",
    bonusTools: ["Bash"],
    bonusActivity: "complex file edits",
    passive: "Blueprint — sees quest objectives more clearly",
    xpBonus: 1.1, // 10% bonus for Bash and complex edits
  },
  [CharacterClass.Scout]: {
    name: "Scout",
    description: "Debugger/investigator",
    bonusTools: ["Read", "Grep"],
    bonusActivity: "search patterns",
    passive: "Tracker — finds rare drops more often, natural crit bonus",
    xpBonus: 1.1, // 10% bonus for Read and Grep
    critBonus: BALANCE.CRIT.SCOUT_BONUS,
    dropRateBonus: 0.15, // 15% better rare drop rates
  },
  [CharacterClass.Artificer]: {
    name: "Artificer",
    description: "Builder/creator",
    bonusTools: ["Write"],
    bonusActivity: "new file creation",
    passive: "Craftsmanship — better gear drops",
    xpBonus: 1.1, // 10% bonus for Write and new files
    gearDropBonus: 0.20, // 20% better gear drop rates
  },
  [CharacterClass.Battlemage]: {
    name: "Battlemage",
    description: "Full-stack generalist",
    bonusTools: [],
    bonusActivity: "everything equally",
    passive: "Versatility — can equip any materia type",
    xpBonus: 1.0, // No bonus, but no penalty either
    materiaFlexibility: true, // Can equip any materia combination
  },
} as const;

// =====================
// Server Configuration
// =====================

export const SERVER = {
  DEFAULT_PORT: 3000,
  WEBSOCKET_HEARTBEAT_INTERVAL: 30000, // 30 seconds
  MAX_WEBSOCKET_CONNECTIONS: 10,
  DEFAULT_BATCH_INTERVAL: 5, // minutes
  MAX_BATCH_INTERVAL: 60, // minutes
  MIN_BATCH_INTERVAL: 1, // minutes
  SESSION_TIMEOUT: 600000, // 10 minutes
  MAX_HISTORY_EVENTS: 1000,
} as const;

// =====================
// Default Settings
// =====================

export const DEFAULT_SETTINGS = {
  watchPaths: [], // Will be populated with user's ~/.claude/projects/
  batchIntervalMinutes: SERVER.DEFAULT_BATCH_INTERVAL,
  showAnimations: true,
  soundEnabled: true,
  showNotifications: true,
  autoEquipBetterGear: false,
  skipTutorial: false,
  compactUI: false,
  debugMode: false,
  maxHistoryEvents: SERVER.MAX_HISTORY_EVENTS,
} as const;

// =====================
// JSONL Tool Names
// =====================

export const TOOL_NAMES = [
  "Bash",
  "Glob",
  "Grep",
  "LS",
  "Read",
  "Edit",
  "MultiEdit",
  "Write",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
  "TodoRead",
  "Task",
  "Explore",
  "ExitPlanMode",
] as const;

export type ToolName = typeof TOOL_NAMES[number];

// =====================
// Zone Configuration
// =====================

export const ZONES = {
  BASE_CAMP: {
    id: "cloud-city-base-camp",
    name: "Cloud City Base Camp",
    description: "Your home base in the clouds",
    isStartingZone: true,
    unlockLevel: 1,
  },

  // Dynamic zones will be generated based on coding patterns
  MAX_DYNAMIC_ZONES: 6,
  UNLOCK_INTERVAL: 3, // New zone every 3 levels
} as const;

// =====================
// Quest Configuration
// =====================

export const QUESTS = {
  MAX_ACTIVE_MICRO: 5,
  MAX_ACTIVE_SESSION: 3,
  MAX_ACTIVE_EPIC: 1,

  // Quest duration limits
  MICRO_DURATION: 30, // minutes
  SESSION_DURATION: 240, // 4 hours
  EPIC_DURATION: 10080, // 1 week in minutes

  // Generation rates
  MICRO_GENERATION_CHANCE: 0.7, // 70% chance per qualifying event
  SESSION_GENERATION_CHANCE: 0.4, // 40% chance per batch with sufficient activity
  EPIC_GENERATION_CHANCE: 0.1, // 10% chance per level up after level 5
} as const;

// =====================
// Anti-Grind Protection
// =====================

export const ANTI_GRIND = {
  // Diminishing returns after these thresholds per batch
  XP_DIMINISHING_THRESHOLDS: {
    edits: 20,
    fileReads: 30,
    grepSearches: 15,
    testRuns: 50,
  },

  // Daily activity caps (resets at midnight local time)
  DAILY_CAPS: {
    maxMicroQuests: 20,
    maxBonusXP: 500,
  },

  // Session protection
  MAX_SESSION_DURATION: 480, // 8 hours
  BREAK_REMINDER_INTERVAL: 120, // 2 hours
} as const;

// =====================
// Error Messages
// =====================

export const ERROR_MESSAGES = {
  SAVE_FILE_CORRUPTED: "Game save file is corrupted. Attempting to restore from backup.",
  BACKUP_FILE_CORRUPTED: "Both save and backup files are corrupted. Starting fresh.",
  CLAUDE_API_ERROR: "Game engine is offline. Events are being queued for when it returns.",
  JSONL_PARSE_ERROR: "Failed to parse session transcript. Skipping malformed entries.",
  WEBSOCKET_CONNECTION_FAILED: "Failed to establish WebSocket connection. Retrying...",
  INVALID_GAME_STATE: "Game state is invalid. Please restart the game.",
} as const;

// =====================
// Success Messages
// =====================

export const SUCCESS_MESSAGES = {
  LEVEL_UP: "Level up! You've grown stronger.",
  CRIT_TRIGGERED: "Critical hit! Exceptional coding detected.",
  QUEST_COMPLETED: "Quest completed! Great work.",
  ZONE_UNLOCKED: "New zone discovered! Adventure awaits.",
  ITEM_FOUND: "Item found! Check your inventory.",
  STACKJACK_WIN: "Victory! You've mastered your opponent.",
} as const;