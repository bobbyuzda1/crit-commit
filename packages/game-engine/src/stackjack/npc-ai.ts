import type { StackjackCard } from "@crit-commit/shared";
import { CardType } from "@crit-commit/shared";
import { calculatePotentialEffect, canPlayCard } from "./card-effects.js";
import type { StackjackMatchState } from "./card-effects.js";

/**
 * NPC turn action result
 */
export interface NPCAction {
  action: "stand" | "end_turn" | "play_card";
  cardId?: string;
  flipChoice?: "plus" | "minus";
}

/**
 * Determines the NPC's action based on difficulty tier and current match state
 */
export function npcTurn(
  match: StackjackMatchState,
  difficulty: "easy" | "medium" | "hard",
  sideDeck: StackjackCard[]
): NPCAction {
  const opponentTotal = match.opponentTotal;

  // Determine standing threshold based on difficulty
  const standingThreshold = getStandingThreshold(difficulty);

  // Check if NPC should stand
  if (opponentTotal >= standingThreshold && opponentTotal <= 20) {
    return { action: "stand" };
  }

  // Get playable cards
  const playableCards = sideDeck.filter(card => canPlayCard(match, card));

  if (playableCards.length === 0) {
    return { action: "end_turn" };
  }

  // Choose card based on difficulty strategy
  switch (difficulty) {
    case "easy":
      return easyStrategy(match, playableCards);
    case "medium":
      return mediumStrategy(match, playableCards);
    case "hard":
      return hardStrategy(match, playableCards);
    default:
      return { action: "end_turn" };
  }
}

/**
 * Get standing threshold based on difficulty
 */
function getStandingThreshold(difficulty: "easy" | "medium" | "hard"): number {
  switch (difficulty) {
    case "easy": return 17;
    case "medium": return 18;
    case "hard": return 19;
    default: return 17;
  }
}

/**
 * Easy strategy: Random card selection, conservative play
 */
function easyStrategy(match: StackjackMatchState, cards: StackjackCard[]): NPCAction {
  const opponentTotal = match.opponentTotal;
  const standingThreshold = getStandingThreshold("easy"); // 17

  // When below standing threshold, prefer main deck draws (end_turn)
  if (opponentTotal < standingThreshold) {
    // Only play cards if they have a very low chance (20%) when below threshold
    if (Math.random() > 0.8) {
      // Find safe cards
      const safeCards = cards.filter(card => {
        const effect = calculatePotentialEffect(match, card, "plus");
        return match.opponentTotal + effect <= 21;
      });

      if (safeCards.length > 0) {
        const randomCard = safeCards[Math.floor(Math.random() * safeCards.length)];
        const flipChoice = randomCard.type === CardType.Flip
          ? (Math.random() > 0.5 ? "plus" : "minus")
          : undefined;

        return {
          action: "play_card",
          cardId: randomCard.id,
          flipChoice
        };
      }
    }

    return { action: "end_turn" };
  }

  // When at or above standing threshold, use original logic
  const safeCards = cards.filter(card => {
    const effect = calculatePotentialEffect(match, card, "plus");
    return match.opponentTotal + effect <= 21;
  });

  if (safeCards.length === 0) {
    return { action: "end_turn" };
  }

  // 70% chance to play a card, 30% chance to end turn (conservative)
  if (Math.random() > 0.3) {
    const randomCard = safeCards[Math.floor(Math.random() * safeCards.length)];
    const flipChoice = randomCard.type === CardType.Flip
      ? (Math.random() > 0.5 ? "plus" : "minus")
      : undefined;

    return {
      action: "play_card",
      cardId: randomCard.id,
      flipChoice
    };
  }

  return { action: "end_turn" };
}

/**
 * Medium strategy: Strategic play, considers current state
 */
function mediumStrategy(match: StackjackMatchState, cards: StackjackCard[]): NPCAction {
  const opponentTotal = match.opponentTotal;
  const targetRange = { min: 18, max: 20 };

  // If busted, try to play minus cards to get back under 21
  if (opponentTotal > 20) {
    const rescueCard = findRescueCard(match, cards);
    if (rescueCard) {
      return rescueCard;
    }
  }

  // Find the best card to reach target range
  const bestCard = findBestCardForTarget(match, cards, targetRange);

  if (bestCard) {
    return bestCard;
  }

  // No good card options, end turn
  return { action: "end_turn" };
}

/**
 * Hard strategy: Optimal play, considers opponent state and special cards
 */
function hardStrategy(match: StackjackMatchState, cards: StackjackCard[]): NPCAction {
  const opponentTotal = match.opponentTotal;
  const targetRange = { min: 19, max: 20 };

  // If busted, prioritize recovery
  if (opponentTotal > 20) {
    const rescueCard = findRescueCard(match, cards);
    if (rescueCard) {
      return rescueCard;
    }
  }

  // Check for critical situations where special cards should be used
  const criticalMove = findCriticalMove(match, cards);
  if (criticalMove) {
    return criticalMove;
  }

  // Use special cards strategically
  const specialMove = findOptimalSpecialCardPlay(match, cards, targetRange);
  if (specialMove) {
    return specialMove;
  }

  // Find the best regular card
  const bestCard = findBestCardForTarget(match, cards, targetRange);
  if (bestCard) {
    return bestCard;
  }

  return { action: "end_turn" };
}

/**
 * Find a card that can rescue from a bust situation
 */
function findRescueCard(match: StackjackMatchState, cards: StackjackCard[]): NPCAction | null {
  const opponentTotal = match.opponentTotal;

  for (const card of cards) {
    // Try minus cards first
    if (card.type === CardType.Minus) {
      const effect = calculatePotentialEffect(match, card);
      if (opponentTotal + effect <= 20) {
        return { action: "play_card", cardId: card.id };
      }
    }

    // Try flip cards with minus choice
    if (card.type === CardType.Flip) {
      const effect = calculatePotentialEffect(match, card, "minus");
      if (opponentTotal + effect <= 20) {
        return { action: "play_card", cardId: card.id, flipChoice: "minus" };
      }
    }

    // Try rebase if it would help
    if (card.type === CardType.Rebase) {
      return { action: "play_card", cardId: card.id };
    }
  }

  return null;
}

/**
 * Find the best card to reach a target range
 */
function findBestCardForTarget(
  match: StackjackMatchState,
  cards: StackjackCard[],
  targetRange: { min: number; max: number }
): NPCAction | null {
  const opponentTotal = match.opponentTotal;
  let bestCard: StackjackCard | null = null;
  let bestScore = -Infinity;
  let bestFlipChoice: "plus" | "minus" | undefined;

  for (const card of cards) {
    // Skip special cards for now (handled separately in hard strategy)
    if (isSpecialCard(card)) {
      continue;
    }

    const evaluations = getCardEvaluations(match, card);

    for (const evaluation of evaluations) {
      const newTotal = opponentTotal + evaluation.effect;
      const score = scoreTotal(newTotal, targetRange);

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
        bestFlipChoice = evaluation.flipChoice;
      }
    }
  }

  if (bestCard && bestScore > -100) { // Only play if reasonably good
    return {
      action: "play_card",
      cardId: bestCard.id,
      flipChoice: bestFlipChoice
    };
  }

  return null;
}

/**
 * Find critical moves for hard difficulty (e.g., overflow when at exactly 20)
 */
function findCriticalMove(match: StackjackMatchState, cards: StackjackCard[]): NPCAction | null {
  const opponentTotal = match.opponentTotal;

  // Use overflow when at exactly 20 to instantly bust opponent
  if (opponentTotal === 20) {
    const overflowCard = cards.find(card => card.type === CardType.Overflow);
    if (overflowCard) {
      return { action: "play_card", cardId: overflowCard.id };
    }
  }

  // Use rebase when very far from target and it's more efficient
  if (opponentTotal < 8) {
    const rebaseCard = cards.find(card => card.type === CardType.Rebase);
    if (rebaseCard) {
      return { action: "play_card", cardId: rebaseCard.id };
    }
  }

  return null;
}

/**
 * Find optimal special card plays for hard difficulty
 */
function findOptimalSpecialCardPlay(
  match: StackjackMatchState,
  cards: StackjackCard[],
  targetRange: { min: number; max: number }
): NPCAction | null {
  const opponentTotal = match.opponentTotal;

  // Use fork only in truly advantageous situations
  const forkCard = cards.find(card => card.type === CardType.Fork);
  if (forkCard && match.opponentLastDraw && match.opponentLastDraw >= 6) { // Very conservative threshold
    const newTotal = opponentTotal + match.opponentLastDraw;

    // Only use fork if it's significantly better than regular options
    if (newTotal === 20) { // Only use if it hits perfect 20
      const regularCards = cards.filter(card => !isSpecialCard(card));
      const bestRegularScore = Math.max(...regularCards.map(card => {
        const effect = calculatePotentialEffect(match, card);
        const regularTotal = opponentTotal + effect;
        return scoreTotal(regularTotal, targetRange);
      }));

      // Only use fork if it's significantly better than the best regular option
      if (scoreTotal(newTotal, targetRange) - bestRegularScore >= 50) {
        return { action: "play_card", cardId: forkCard.id };
      }
    }
  }

  // Use recursive if it's likely to be beneficial
  const recursiveCard = cards.find(card => card.type === CardType.Recursive);
  if (recursiveCard && cards.length > 3) { // Only use if we have other good cards
    return { action: "play_card", cardId: recursiveCard.id };
  }

  // Use merge if it's beneficial
  const mergeCard = cards.find(card => card.type === CardType.Merge);
  if (mergeCard && match.mainDrawHistory.length >= 2) {
    const lastTwo = match.mainDrawHistory.slice(-2);
    const average = Math.floor((lastTwo[0] + lastTwo[1]) / 2);
    const effect = average - (lastTwo[0] + lastTwo[1]);
    const newTotal = opponentTotal + effect;

    if (newTotal >= targetRange.min && newTotal <= 20) {
      return { action: "play_card", cardId: mergeCard.id };
    }
  }

  return null;
}

/**
 * Get all possible evaluations for a card (including flip choices)
 */
function getCardEvaluations(match: StackjackMatchState, card: StackjackCard): Array<{effect: number, flipChoice?: "plus" | "minus"}> {
  if (card.type === CardType.Flip) {
    return [
      { effect: calculatePotentialEffect(match, card, "plus"), flipChoice: "plus" },
      { effect: calculatePotentialEffect(match, card, "minus"), flipChoice: "minus" }
    ];
  }

  return [{ effect: calculatePotentialEffect(match, card) }];
}

/**
 * Score a total based on how good it is for the target range
 */
function scoreTotal(total: number, targetRange: { min: number; max: number }): number {
  if (total > 21) {
    return -1000; // Bust is very bad
  }

  if (total >= targetRange.min && total <= targetRange.max) {
    return 100; // In target range is great
  }

  if (total === 20) {
    return 95; // 20 is always good
  }

  // Distance from target range
  const distanceFromMin = Math.abs(total - targetRange.min);
  const distanceFromMax = Math.abs(total - targetRange.max);
  const minDistance = Math.min(distanceFromMin, distanceFromMax);

  return 50 - (minDistance * 10); // Closer to target is better
}

/**
 * Check if a card is considered "special" and should be saved for optimal moments
 */
function isSpecialCard(card: StackjackCard): boolean {
  const specialTypes = [
    CardType.Fork,
    CardType.Null,
    CardType.Rebase,
    CardType.Merge,
    CardType.Recursive,
    CardType.Crit,
    CardType.Overflow
  ];

  return specialTypes.includes(card.type);
}

