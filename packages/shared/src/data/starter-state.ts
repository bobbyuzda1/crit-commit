// Starter game state factory for new players

import {
  GameState,
  Character,
  CharacterClass,
  GameStats,
  Zone,
  StackjackState,
  NarrativeState,
} from "../types/game-state.js";
import { CURRENT_SCHEMA_VERSION, ZONES, BALANCE } from "../constants.js";
import { getStarterDeck } from "../types/cards.js";
import { BASE_CAMP_NPCS } from "./npc-decks.js";

/**
 * Create a complete starter game state for a new player
 */
export function createStarterState(name: string, characterClass: CharacterClass): GameState {
  const now = new Date().toISOString();

  // Create starting character
  const character: Character = {
    name,
    class: characterClass,
    level: 1,
    xp: 0,
    xpToNext: BALANCE.XP_CURVE[1],
    critChance: BALANCE.CRIT.BASE_CHANCE,
    critMultiplier: BALANCE.CRIT.BASE_MULTIPLIER,
    xpBonus: 1.0,
    createdAt: now,
  };

  // Create empty stats
  const stats: GameStats = {
    totalXP: 0,
    totalCrits: 0,
    maxCritStreak: 0,
    questsCompleted: 0,
    stackjackWins: 0,
    stackjackLosses: 0,
    zonesUnlocked: 1, // Base camp is unlocked
    sessionCount: 0,
    totalPlayTime: 0,
  };

  // Create base camp zone with NPCs
  const baseCampZone: Zone = {
    id: ZONES.BASE_CAMP.id,
    name: ZONES.BASE_CAMP.name,
    description: ZONES.BASE_CAMP.description,
    isUnlocked: true,
    isActive: true,
    level: 1,
    theme: "clouds",
    npcs: BASE_CAMP_NPCS,
    encounters: [],
    unlockedAt: now,
  };

  // Create inactive Stackjack state
  const stackjackState: StackjackState = {
    isActive: false,
    playerTotal: 0,
    opponentTotal: 0,
    playerCards: [],
    opponentCards: [],
    playerSideDeck: [],
    opponentSideDeck: [],
    playerRoundsWon: 0,
    opponentRoundsWon: 0,
    currentRound: 0,
    isPlayerTurn: true,
    hasPlayerStood: false,
    hasOpponentStood: false,
    gameOver: false,
  };

  // Create initial narrative state
  const narrative: NarrativeState = {
    currentStoryArc: "arrival",
    storyArcs: {
      arrival: {
        phase: "welcome",
        completed: false,
      },
    },
    recentEvents: [],
    encounterHistory: [],
    lastClaudeCall: "",
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    character,
    stats,
    party: [],
    inventory: [],
    equippedGear: {
      weapon: undefined,
      armor: undefined,
      accessory: undefined,
    },
    materiaCollection: [],
    equippedMateria: [],
    activeQuests: [],
    completedQuests: [],
    availableQuests: [],
    zones: [baseCampZone],
    currentZoneId: ZONES.BASE_CAMP.id,
    stackjackState,
    cardCollection: getStarterDeck(),
    narrative,
    isInSession: false,
    critStreak: 0,
    createdAt: now,
    updatedAt: now,
  };
}