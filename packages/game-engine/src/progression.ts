// Progression Engine - XP, Leveling, Crits, Drops
// Handles all character progression mechanics for Crit Commit RPG

import {
  GameState,
  ItemRarity,
  CharacterClass,
  Character,
} from "@crit-commit/shared";
import { BALANCE, CLASS_CONFIG } from "@crit-commit/shared";

// Extended character interface with ascension stars
interface CharacterWithAscension extends Character {
  ascensionStars?: number;
}

/**
 * Award XP to character and handle level ups
 */
export function awardXP(state: GameState, amount: number): GameState {
  const newState = { ...state };
  newState.character = { ...state.character };
  newState.stats = { ...state.stats };

  // Add XP
  newState.character.xp += amount;
  newState.stats.totalXP += amount;

  // Check for level ups (can happen multiple times if huge XP amount)
  while (newState.character.level < 20 && newState.character.xp >= newState.character.xpToNext) {
    // Level up!
    newState.character.xp -= newState.character.xpToNext;
    newState.character.level++;

    // Set new XP threshold
    if (newState.character.level <= 20) {
      newState.character.xpToNext = BALANCE.XP_CURVE[newState.character.level as keyof typeof BALANCE.XP_CURVE] || 0;
    }

    // Update crit chance based on new level
    newState.character.critChance = calculateCritChance(newState);
  }

  // Cap at level 20
  if (newState.character.level >= 20) {
    newState.character.level = 20;
    newState.character.xp = 0;
    newState.character.xpToNext = 0;
  }

  return newState;
}

/**
 * Calculate current crit chance based on level, class, and gear
 */
export function calculateCritChance(state: GameState): number {
  let critChance = BALANCE.CRIT.BASE_CHANCE;

  // Level bonus
  critChance += (state.character.level - 1) * BALANCE.CRIT.LEVEL_BONUS;

  // Scout class bonus
  if (state.character.class === CharacterClass.Scout) {
    critChance += CLASS_CONFIG[CharacterClass.Scout].critBonus || 0;
  }

  // TODO: Add gear bonuses when gear system is implemented
  // TODO: Add materia bonuses when materia system is implemented

  return Math.min(critChance, 1.0); // Cap at 100%
}

/**
 * Roll for a crit based on chance
 */
export function rollCrit(critChance: number): boolean {
  return Math.random() < critChance;
}

/**
 * Roll for a loot drop based on drop chance
 */
export function rollDrop(dropChance: number): ItemRarity | null {
  // First check if any drop occurs
  if (Math.random() > dropChance) {
    return null;
  }

  // If drop occurs, determine rarity
  const roll = Math.random();
  let cumulative = 0;

  const rarities: ItemRarity[] = [ItemRarity.Legendary, ItemRarity.Rare, ItemRarity.Uncommon, ItemRarity.Common];
  const rates = [
    BALANCE.DROP_RATES.LEGENDARY,
    BALANCE.DROP_RATES.RARE,
    BALANCE.DROP_RATES.UNCOMMON,
    BALANCE.DROP_RATES.COMMON,
  ];

  for (let i = 0; i < rarities.length; i++) {
    cumulative += rates[i];
    if (roll <= cumulative) {
      return rarities[i];
    }
  }

  return ItemRarity.Common; // Fallback
}

/**
 * Check and update crit streak
 */
export function checkCritStreak(state: GameState, isCrit: boolean): GameState {
  const newState = { ...state };
  newState.stats = { ...state.stats };

  if (isCrit) {
    // Increment streak
    newState.critStreak = (state.critStreak || 0) + 1;

    // Update max streak stat
    if (newState.critStreak > newState.stats.maxCritStreak) {
      newState.stats.maxCritStreak = newState.critStreak;
    }

    // Update total crits
    newState.stats.totalCrits++;
  } else {
    // Reset streak on non-crit
    newState.critStreak = 0;
  }

  return newState;
}

/**
 * Apply ascension - reset to level 1, grant ascension star
 */
export function applyAscension(state: GameState): GameState {
  const newState = { ...state };
  const characterWithAscension = newState.character as CharacterWithAscension;

  // Reset level and XP
  characterWithAscension.level = 1;
  characterWithAscension.xp = 0;
  characterWithAscension.xpToNext = BALANCE.XP_CURVE[1];

  // Grant ascension star
  const currentStars = characterWithAscension.ascensionStars || 0;
  characterWithAscension.ascensionStars = currentStars + 1;

  // Reset crit chance to base
  characterWithAscension.critChance = calculateCritChance(newState);

  // Update the state with the modified character
  newState.character = characterWithAscension;

  // Zones and other progress remain unlocked
  // (this is handled by keeping the existing zones array)

  return newState;
}