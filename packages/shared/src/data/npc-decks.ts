// Base Camp NPC definitions and their Stackjack decks

import { StackjackNPC } from "../types/game-state.js";
import { getNPCDeckCards } from "../types/cards.js";
import { ZONES } from "../constants.js";

/**
 * Get a 4-card subset of Common cards for easy NPC decks
 */
function getEasyNPCDeck() {
  const commonCards = getNPCDeckCards("easy");
  // Return first 4 common cards for consistent easy gameplay
  return commonCards.slice(0, 4);
}

/**
 * Base camp NPCs - always available for Stackjack games
 */
export const BASE_CAMP_NPCS: StackjackNPC[] = [
  {
    id: "pixel-pete",
    name: "Pixel Pete",
    portrait: "pixel-pete.png",
    difficulty: "easy",
    zoneId: ZONES.BASE_CAMP.id,
    deck: getEasyNPCDeck(),
    wins: 0,
    losses: 0,
    isUnlocked: true,
    description: "A friendly pixel artist who loves a good card game. Great for learning Stackjack basics.",
  },
  {
    id: "byte-the-barista",
    name: "Byte the Barista",
    portrait: "byte-barista.png",
    difficulty: "easy",
    zoneId: ZONES.BASE_CAMP.id,
    deck: getEasyNPCDeck(),
    wins: 0,
    losses: 0,
    isUnlocked: true,
    description: "The coffee shop owner with a caffeinated approach to card games. Expects good sportsmanship.",
  },
];