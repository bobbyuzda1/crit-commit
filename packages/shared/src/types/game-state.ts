// Game State Types for Crit Commit RPG

// =====================
// Character System
// =====================

export enum CharacterClass {
  Architect = "architect",
  Scout = "scout",
  Artificer = "artificer",
  Battlemage = "battlemage"
}

export interface Character {
  name: string;
  class: CharacterClass;
  level: number;
  xp: number;
  xpToNext: number;
  critChance: number;
  critMultiplier: number;
  xpBonus: number;
  ascensionLevel?: number;
  createdAt: string;
}

export interface GameStats {
  totalXP: number;
  totalCrits: number;
  maxCritStreak: number;
  questsCompleted: number;
  stackjackWins: number;
  stackjackLosses: number;
  zonesUnlocked: number;
  sessionCount: number;
  totalPlayTime: number;
}

// =====================
// Party System
// =====================

export interface PartyMember {
  id: string;
  name: string;
  class: CharacterClass;
  sessionPath: string;
  isActive: boolean;
  lastActivity: string;
  isSubAgent?: boolean;
  subAgentType?: string;
}

// =====================
// Inventory & Items
// =====================

export enum ItemRarity {
  Common = "common",
  Uncommon = "uncommon",
  Rare = "rare",
  Legendary = "legendary"
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  type: "gear" | "consumable" | "material";
  value?: number;
  effects?: Record<string, number>;
  isEquipped?: boolean;
  obtainedAt: string;
}

export interface EquippedGear {
  weapon?: InventoryItem;
  armor?: InventoryItem;
  accessory?: InventoryItem;
}

// =====================
// Materia System
// =====================

export enum MateriaType {
  Skill = "skill",    // Green - Languages/frameworks
  Tool = "tool",      // Yellow - Developer tools
  Spirit = "spirit"   // Red - AI activity
}

export interface Materia {
  id: string;
  name: string;
  type: MateriaType;
  level: number;
  ap: number;
  apToNext: number;
  maxLevel: number;
  description: string;
  bonuses: Record<string, number>;
  isEquipped?: boolean;
  obtainedAt: string;
}

// =====================
// Quest System
// =====================

export enum QuestState {
  Available = "available",
  Active = "active",
  Completed = "completed",
  Failed = "failed"
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "micro" | "session" | "epic";
  tier: number;
  state: QuestState;
  progress: number;
  maxProgress: number;
  xpReward: number;
  itemRewards: InventoryItem[];
  completedAt?: string;
  expiresAt?: string;
  requirements?: Record<string, unknown>;
}

// =====================
// World & Zones
// =====================

export interface Zone {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  isActive: boolean;
  level: number;
  theme: string;
  npcs: StackjackNPC[];
  encounters: Encounter[];
  unlockedAt?: string;
}

export interface ZoneChoice {
  zoneId: string;
  reason: string;
  timestamp: string;
}

// =====================
// Stackjack Card Game
// =====================

export enum CardType {
  Plus = "plus",
  Minus = "minus",
  Flip = "flip",
  Fork = "fork",
  Null = "null",
  Rebase = "rebase",
  Merge = "merge",
  Recursive = "recursive",
  Crit = "crit",
  Overflow = "overflow"
}

export interface StackjackCard {
  id: string;
  name: string;
  type: CardType;
  value?: number;
  rarity: ItemRarity;
  description: string;
  effect?: string;
}

export interface StackjackNPC {
  id: string;
  name: string;
  portrait: string;
  difficulty: "easy" | "medium" | "hard";
  zoneId: string;
  deck: StackjackCard[];
  wins: number;
  losses: number;
  isUnlocked: boolean;
  description?: string;
}

export interface StackjackState {
  isActive: boolean;
  opponent?: StackjackNPC;
  playerTotal: number;
  opponentTotal: number;
  playerCards: StackjackCard[];
  opponentCards: StackjackCard[];
  playerSideDeck: StackjackCard[];
  opponentSideDeck: StackjackCard[];
  playerRoundsWon: number;
  opponentRoundsWon: number;
  currentRound: number;
  isPlayerTurn: boolean;
  hasPlayerStood: boolean;
  hasOpponentStood: boolean;
  lastAction?: string;
  gameOver: boolean;
  winner?: "player" | "opponent";
}

// =====================
// Narrative System
// =====================

export interface NarrativeEvent {
  id: string;
  type: "encounter" | "quest" | "crit" | "level_up" | "zone_unlock" | "story";
  title: string;
  description: string;
  timestamp: string;
  zoneId?: string;
  questId?: string;
  isRead: boolean;
}

export interface Encounter {
  id: string;
  type: "combat" | "puzzle" | "story" | "boss";
  name: string;
  description: string;
  zoneId: string;
  isActive: boolean;
  isCompleted: boolean;
  difficulty: number;
  rewards: InventoryItem[];
  xpReward: number;
}

export interface NarrativeState {
  currentStoryArc: string;
  storyArcs: Record<string, unknown>;
  recentEvents: NarrativeEvent[];
  encounterHistory: string[];
  lastClaudeCall: string;
}

// =====================
// Main Game State
// =====================

export interface GameState {
  // Schema versioning
  schemaVersion: number;

  // Core character
  character: Character;
  stats: GameStats;

  // Party system
  party: PartyMember[];

  // Inventory and progression
  inventory: InventoryItem[];
  equippedGear: EquippedGear;
  materiaCollection: Materia[];
  equippedMateria: Materia[];

  // Quest system
  activeQuests: Quest[];
  completedQuests: Quest[];
  availableQuests: Quest[];

  // World state
  zones: Zone[];
  currentZoneId?: string;

  // Stackjack
  stackjackState: StackjackState;
  cardCollection: StackjackCard[];

  // Narrative
  narrative: NarrativeState;

  // Session state
  isInSession: boolean;
  sessionStartTime?: string;
  critStreak: number;
  lastBatchTime?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}