import type { StackjackCard } from "@crit-commit/shared";
import { CardType } from "@crit-commit/shared";

/**
 * Extended match state interface for special card effects
 */
export interface StackjackMatchState {
  playerTotal: number;
  opponentTotal: number;
  playerSideDeck: StackjackCard[];
  opponentSideDeck: StackjackCard[];
  mainDeckLastDraw: number | null;
  opponentLastDraw: number | null;
  mainDrawHistory: number[];
  isPlayerTurn: boolean;
  critNextCard: boolean;
}

/**
 * Applies a card effect to the match state and returns a new state
 */
export function applyCardEffect(
  match: StackjackMatchState,
  card: StackjackCard,
  flipChoice?: "plus" | "minus"
): StackjackMatchState {
  // Create a deep copy of the state to avoid mutations
  const newState: StackjackMatchState = {
    ...match,
    playerSideDeck: [...match.playerSideDeck],
    opponentSideDeck: [...match.opponentSideDeck],
    mainDrawHistory: [...match.mainDrawHistory],
  };

  // Apply crit multiplier if active
  const critMultiplier = match.critNextCard ? 2 : 1;

  // Calculate base effect and apply crit multiplier for applicable cards
  let effect = 0;

  switch (card.type) {
    case CardType.Plus:
      effect = (card.value || 0) * critMultiplier;
      break;

    case CardType.Minus:
      effect = -(card.value || 0) * critMultiplier;
      break;

    case CardType.Flip:
      const multiplier = flipChoice === "minus" ? -1 : 1;
      effect = (card.value || 0) * multiplier * critMultiplier;
      break;

    case CardType.Fork:
      effect = handleForkCard(newState);
      break;

    case CardType.Null:
      effect = handleNullCard(newState);
      break;

    case CardType.Rebase:
      effect = handleRebaseCard(newState);
      break;

    case CardType.Merge:
      effect = handleMergeCard(newState);
      break;

    case CardType.Recursive:
      effect = handleRecursiveCard(newState);
      break;

    case CardType.Crit:
      return handleCritCard(newState);

    case CardType.Overflow:
      return handleOverflowCard(newState);

    default:
      effect = 0;
  }

  // Apply the effect to the current player
  if (newState.isPlayerTurn) {
    newState.playerTotal += effect;
  } else {
    newState.opponentTotal += effect;
  }

  // Clear crit flag if it was active (consumed by non-Crit cards)
  if (match.critNextCard) {
    newState.critNextCard = false;
  }

  return newState;
}

/**
 * Fork card: Copy opponent's last main deck draw
 */
function handleForkCard(state: StackjackMatchState): number {
  return state.opponentLastDraw || 0;
}

/**
 * Null card: Cancel current main deck draw (negate its effect)
 */
function handleNullCard(state: StackjackMatchState): number {
  if (state.mainDeckLastDraw === null || state.mainDeckLastDraw === 0) {
    return 0;
  }

  // Store the original value before nullifying it
  const originalDraw = state.mainDeckLastDraw;

  // Set the last draw to 0 to indicate it was nullified
  state.mainDeckLastDraw = 0;

  // Return the negative of the original draw to cancel its effect
  return -originalDraw;
}

/**
 * Rebase card: Reset player's total to 10
 */
function handleRebaseCard(state: StackjackMatchState): number {
  const currentTotal = state.isPlayerTurn ? state.playerTotal : state.opponentTotal;
  return 10 - currentTotal;
}

/**
 * Merge card: Average the last two main deck draws
 */
function handleMergeCard(state: StackjackMatchState): number {
  if (state.mainDrawHistory.length < 2) {
    return 0; // Can't merge with fewer than 2 draws
  }

  const lastTwo = state.mainDrawHistory.slice(-2);
  const [secondLast, last] = lastTwo;

  // Calculate average, rounded down
  const average = Math.floor((secondLast + last) / 2);

  // Update the history by replacing the last two draws with their average
  state.mainDrawHistory = [
    ...state.mainDrawHistory.slice(0, -2),
    average
  ];

  // Return the net effect: remove the original two, add the average
  return average - (secondLast + last);
}

/**
 * Recursive card: Play this card, then draw and play one random bonus card
 */
function handleRecursiveCard(state: StackjackMatchState): number {
  const sideDeck = state.isPlayerTurn ? state.playerSideDeck : state.opponentSideDeck;

  // Find eligible cards (non-Recursive, non-Legendary)
  const eligibleCards = sideDeck.filter(card =>
    card.type !== CardType.Recursive &&
    card.rarity !== "legendary"
  );

  if (eligibleCards.length === 0) {
    return 0; // No bonus card to play
  }

  // Select a random eligible card
  const randomIndex = Math.floor(Math.random() * eligibleCards.length);
  const bonusCard = eligibleCards[randomIndex];

  // Remove the bonus card from the side deck
  const cardIndex = sideDeck.findIndex(card => card.id === bonusCard.id);
  if (cardIndex !== -1) {
    if (state.isPlayerTurn) {
      state.playerSideDeck.splice(cardIndex, 1);
    } else {
      state.opponentSideDeck.splice(cardIndex, 1);
    }
  }

  // Apply the bonus card's effect (recursive call without crit multiplier)
  const bonusState = applyCardEffect({
    ...state,
    critNextCard: false // Don't apply crit to bonus card
  }, bonusCard);

  // Return the difference in total from the bonus card
  const totalBefore = state.isPlayerTurn ? state.playerTotal : state.opponentTotal;
  const totalAfter = state.isPlayerTurn ? bonusState.playerTotal : bonusState.opponentTotal;

  return totalAfter - totalBefore;
}

/**
 * Crit Card: Doubles the value of the next card played
 */
function handleCritCard(state: StackjackMatchState): StackjackMatchState {
  return {
    ...state,
    critNextCard: true
  };
}

/**
 * Overflow card: If player total is exactly 20, set opponent to 21 (instant bust)
 */
function handleOverflowCard(state: StackjackMatchState): StackjackMatchState {
  const playerTotal = state.isPlayerTurn ? state.playerTotal : state.opponentTotal;

  if (playerTotal === 20) {
    // Bust the opponent
    if (state.isPlayerTurn) {
      state.opponentTotal = 21;
    } else {
      state.playerTotal = 21;
    }
  }

  return state;
}

/**
 * Check if a card can be played in the current game context
 */
export function canPlayCard(
  match: StackjackMatchState,
  card: StackjackCard
): boolean {
  const currentTotal = match.isPlayerTurn ? match.playerTotal : match.opponentTotal;

  switch (card.type) {
    case CardType.Fork:
      // Can only fork if opponent has drawn a card
      return match.opponentLastDraw !== null;

    case CardType.Null:
      // Can only null if a main card was just drawn
      return match.mainDeckLastDraw !== null && match.mainDeckLastDraw > 0;

    case CardType.Merge:
      // Can only merge if there are at least 2 draws in history
      return match.mainDrawHistory.length >= 2;

    case CardType.Overflow:
      // Can only overflow if player total is exactly 20
      return currentTotal === 20;

    case CardType.Recursive:
      // Can only play if there are eligible bonus cards
      const sideDeck = match.isPlayerTurn ? match.playerSideDeck : match.opponentSideDeck;
      return sideDeck.some(card =>
        card.type !== CardType.Recursive &&
        card.rarity !== "legendary"
      );

    default:
      // Most cards can always be played
      return true;
  }
}

/**
 * Calculate the potential effect of a card without applying it
 */
export function calculatePotentialEffect(
  match: StackjackMatchState,
  card: StackjackCard,
  flipChoice?: "plus" | "minus"
): number {
  const critMultiplier = match.critNextCard ? 2 : 1;
  const currentTotal = match.isPlayerTurn ? match.playerTotal : match.opponentTotal;

  switch (card.type) {
    case CardType.Plus:
      return (card.value || 0) * critMultiplier;

    case CardType.Minus:
      return -(card.value || 0) * critMultiplier;

    case CardType.Flip:
      const multiplier = flipChoice === "minus" ? -1 : 1;
      return (card.value || 0) * multiplier * critMultiplier;

    case CardType.Fork:
      return match.opponentLastDraw || 0;

    case CardType.Null:
      return -(match.mainDeckLastDraw || 0);

    case CardType.Rebase:
      return 10 - currentTotal;

    case CardType.Merge:
      if (match.mainDrawHistory.length < 2) return 0;
      const lastTwo = match.mainDrawHistory.slice(-2);
      const average = Math.floor((lastTwo[0] + lastTwo[1]) / 2);
      return average - (lastTwo[0] + lastTwo[1]);

    case CardType.Overflow:
      return 0; // Doesn't affect current player's total

    default:
      return 0;
  }
}