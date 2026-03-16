// Stackjack Card Definitions and Catalog

import { StackjackCard, CardType, ItemRarity } from "./game-state.js";

// =====================
// Card Creation Helper
// =====================

export function createCard(
  id: string,
  name: string,
  type: CardType,
  rarity: ItemRarity,
  description: string,
  value?: number,
  effect?: string
): StackjackCard {
  return {
    id,
    name,
    type,
    value,
    rarity,
    description,
    effect,
  };
}

// =====================
// Base Card Catalog
// =====================

export const BASE_CARD_CATALOG: StackjackCard[] = [
  // Plus Cards (Common 1-3, Uncommon 4-5)
  createCard("plus-1", "+1", CardType.Plus, ItemRarity.Common, "Add 1 to your total", 1),
  createCard("plus-2", "+2", CardType.Plus, ItemRarity.Common, "Add 2 to your total", 2),
  createCard("plus-3", "+3", CardType.Plus, ItemRarity.Common, "Add 3 to your total", 3),
  createCard("plus-4", "+4", CardType.Plus, ItemRarity.Uncommon, "Add 4 to your total", 4),
  createCard("plus-5", "+5", CardType.Plus, ItemRarity.Uncommon, "Add 5 to your total", 5),

  // Minus Cards (Common 1-3, Uncommon 4-5)
  createCard("minus-1", "-1", CardType.Minus, ItemRarity.Common, "Subtract 1 from your total", 1),
  createCard("minus-2", "-2", CardType.Minus, ItemRarity.Common, "Subtract 2 from your total", 2),
  createCard("minus-3", "-3", CardType.Minus, ItemRarity.Common, "Subtract 3 from your total", 3),
  createCard("minus-4", "-4", CardType.Minus, ItemRarity.Uncommon, "Subtract 4 from your total", 4),
  createCard("minus-5", "-5", CardType.Minus, ItemRarity.Uncommon, "Subtract 5 from your total", 5),

  // Flip Cards (Common)
  createCard("flip-1", "±1", CardType.Flip, ItemRarity.Common, "Choose to add or subtract 1", 1),
  createCard("flip-2", "±2", CardType.Flip, ItemRarity.Common, "Choose to add or subtract 2", 2),
  createCard("flip-3", "±3", CardType.Flip, ItemRarity.Common, "Choose to add or subtract 3", 3),
  createCard("flip-4", "±4", CardType.Flip, ItemRarity.Uncommon, "Choose to add or subtract 4", 4),
  createCard("flip-5", "±5", CardType.Flip, ItemRarity.Uncommon, "Choose to add or subtract 5", 5),

  // Special Cards (Uncommon)
  createCard(
    "fork",
    "Fork",
    CardType.Fork,
    ItemRarity.Uncommon,
    "Copy opponent's last main deck draw and add it to your total"
  ),
  createCard(
    "null",
    "Null",
    CardType.Null,
    ItemRarity.Uncommon,
    "Cancel current main deck draw (becomes 0)"
  ),

  // Rare Cards
  createCard(
    "rebase",
    "Rebase",
    CardType.Rebase,
    ItemRarity.Rare,
    "Reset your total to 10"
  ),
  createCard(
    "merge",
    "Merge",
    CardType.Merge,
    ItemRarity.Rare,
    "Remove last two main deck draws, replace with their average (rounded down)",
    undefined,
    "Example: Drew 8 then 3, Merge replaces them with 5 (net -6)"
  ),
  createCard(
    "recursive",
    "Recursive",
    CardType.Recursive,
    ItemRarity.Rare,
    "Play this card, then draw and play one random bonus card from your collection",
    undefined,
    "Bonus card cannot be another Recursive or Legendary"
  ),

  // Legendary Cards
  createCard(
    "crit-card",
    "Crit Card",
    CardType.Crit,
    ItemRarity.Legendary,
    "Doubles the value of the next card played",
    undefined,
    "The most powerful modifier in Stackjack"
  ),
  createCard(
    "overflow",
    "Overflow",
    CardType.Overflow,
    ItemRarity.Legendary,
    "If your total is exactly 20, set opponent to 21 (instant bust)",
    undefined,
    "Only works when played at exactly 20"
  ),
];

// =====================
// Card Utilities
// =====================

/**
 * Get all cards of a specific rarity from the base catalog
 */
export function getCardsByRarity(rarity: ItemRarity): StackjackCard[] {
  return BASE_CARD_CATALOG.filter(card => card.rarity === rarity);
}

/**
 * Get all cards of a specific type from the base catalog
 */
export function getCardsByType(type: CardType): StackjackCard[] {
  return BASE_CARD_CATALOG.filter(card => card.type === type);
}

/**
 * Find a card by ID in the base catalog
 */
export function getCardById(id: string): StackjackCard | undefined {
  return BASE_CARD_CATALOG.find(card => card.id === id);
}

/**
 * Get a starter deck (6 basic cards for new players)
 */
export function getStarterDeck(): StackjackCard[] {
  return [
    getCardById("plus-1")!,
    getCardById("plus-2")!,
    getCardById("minus-1")!,
    getCardById("minus-2")!,
    getCardById("flip-1")!,
    getCardById("flip-2")!,
  ];
}

/**
 * Get cards suitable for NPC decks by difficulty
 */
export function getNPCDeckCards(difficulty: "easy" | "medium" | "hard"): StackjackCard[] {
  switch (difficulty) {
    case "easy":
      return getCardsByRarity(ItemRarity.Common);

    case "medium":
      return [
        ...getCardsByRarity(ItemRarity.Common),
        ...getCardsByRarity(ItemRarity.Uncommon),
      ];

    case "hard":
      return [
        ...getCardsByRarity(ItemRarity.Uncommon),
        ...getCardsByRarity(ItemRarity.Rare),
      ];

    default:
      return getCardsByRarity(ItemRarity.Common);
  }
}

/**
 * Check if a card can be used in a specific game context
 */
export function canPlayCard(
  card: StackjackCard,
  playerTotal: number,
  lastMainCard?: number,
  opponentLastCard?: number
): boolean {
  switch (card.type) {
    case CardType.Fork:
      // Can only fork if opponent has played a card
      return opponentLastCard !== undefined;

    case CardType.Null:
      // Can only null if a main card was just drawn
      return lastMainCard !== undefined && lastMainCard > 0;

    case CardType.Merge:
      // Can only merge if player has at least 2 cards in total
      // (Implementation detail: would need game history)
      return true; // Simplified for now

    case CardType.Overflow:
      // Can only overflow if player total is exactly 20
      return playerTotal === 20;

    default:
      // Most cards can always be played
      return true;
  }
}

/**
 * Calculate the effect of playing a card
 */
export function calculateCardEffect(
  card: StackjackCard,
  currentTotal: number,
  flipChoice?: "plus" | "minus",
  lastMainCard?: number,
  opponentLastCard?: number
): number {
  switch (card.type) {
    case CardType.Plus:
      return card.value || 0;

    case CardType.Minus:
      return -(card.value || 0);

    case CardType.Flip:
      const multiplier = flipChoice === "minus" ? -1 : 1;
      return (card.value || 0) * multiplier;

    case CardType.Fork:
      return opponentLastCard || 0;

    case CardType.Null:
      return -(lastMainCard || 0); // Negates the last main card

    case CardType.Rebase:
      return 10 - currentTotal; // Sets total to 10

    case CardType.Merge:
      // Simplified: would need actual game history
      return 0;

    case CardType.Recursive:
    case CardType.Crit:
    case CardType.Overflow:
      // These have special effects handled elsewhere
      return 0;

    default:
      return 0;
  }
}