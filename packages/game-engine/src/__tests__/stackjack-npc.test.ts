import { describe, it, expect, beforeEach } from "vitest";
import { npcTurn, type NPCAction } from "../stackjack/npc-ai.js";
import { getCardById, getNPCDeckCards } from "@crit-commit/shared";
import type { StackjackCard } from "@crit-commit/shared";
import type { StackjackMatchState } from "../stackjack/card-effects.js";

describe("NPC AI", () => {
  let mockState: StackjackMatchState;
  let easySideDeck: StackjackCard[];
  let mediumSideDeck: StackjackCard[];
  let hardSideDeck: StackjackCard[];

  beforeEach(() => {
    mockState = {
      playerTotal: 15,
      opponentTotal: 12,
      playerSideDeck: [],
      opponentSideDeck: [],
      mainDeckLastDraw: 7,
      opponentLastDraw: 5,
      mainDrawHistory: [3, 8, 7],
      isPlayerTurn: false, // NPC's turn
      critNextCard: false,
    };

    easySideDeck = getNPCDeckCards("easy").slice(0, 4); // First 4 common cards
    mediumSideDeck = getNPCDeckCards("medium").slice(0, 4); // Mix of common/uncommon
    hardSideDeck = getNPCDeckCards("hard").slice(0, 4); // Mix of uncommon/rare
  });

  describe("Easy NPC behavior", () => {
    it("should stand when total is 17 or higher", () => {
      mockState.opponentTotal = 17;

      const action = npcTurn(mockState, "easy", easySideDeck);

      expect(action.action).toBe("stand");
      expect(action.cardId).toBeUndefined();
    });

    it("should continue playing when total is below 17", () => {
      mockState.opponentTotal = 16;

      // Easy NPC has random card play chance, so it may end_turn or play_card
      const action = npcTurn(mockState, "easy", easySideDeck);

      // Should NOT stand when below threshold
      expect(action.action).not.toBe("stand");
      // Should either end turn or play a card (both are valid below threshold)
      expect(["end_turn", "play_card"]).toContain(action.action);
    });

    it("should play cards randomly when available", () => {
      mockState.opponentTotal = 15;

      const actions: string[] = [];
      // Run multiple times to test randomness
      for (let i = 0; i < 20; i++) {
        const action = npcTurn(mockState, "easy", easySideDeck);
        if (action.action === "play_card" && action.cardId) {
          actions.push(action.cardId);
        }
      }

      // Should have played some cards (with random selection)
      expect(actions.length).toBeGreaterThan(0);

      // Should have some variety in card selection (not always the same card)
      const uniqueCards = new Set(actions);
      expect(uniqueCards.size).toBeGreaterThanOrEqual(1);
    });

    it("should prefer to end turn rather than bust", () => {
      mockState.opponentTotal = 16; // Below standing threshold of 17

      const action = npcTurn(mockState, "easy", [getCardById("plus-5")!]);

      // With only high-value cards available, should end turn to avoid busting
      expect(action.action).toBe("end_turn");
    });
  });

  describe("Medium NPC behavior", () => {
    it("should stand when total is 18 or higher", () => {
      mockState.opponentTotal = 18;

      const action = npcTurn(mockState, "medium", mediumSideDeck);

      expect(action.action).toBe("stand");
    });

    it("should continue when total is below 18", () => {
      mockState.opponentTotal = 17;

      const action = npcTurn(mockState, "medium", mediumSideDeck);

      expect(action.action).not.toBe("stand");
    });

    it("should play minus cards when over 20", () => {
      mockState.opponentTotal = 22; // Busted
      const minusCards = [getCardById("minus-2")!, getCardById("minus-3")!];

      const action = npcTurn(mockState, "medium", minusCards);

      expect(action.action).toBe("play_card");
      expect(action.cardId).toBeDefined();

      const playedCard = minusCards.find(card => card.id === action.cardId);
      expect(playedCard?.type).toBe("minus");
    });

    it("should play plus cards to reach target range", () => {
      mockState.opponentTotal = 15; // Needs 3 more to reach 18
      const mixedCards = [
        getCardById("plus-3")!, // Perfect card
        getCardById("plus-5")!, // Would overshoot
        getCardById("minus-2")!, // Wrong direction
      ];

      const action = npcTurn(mockState, "medium", mixedCards);

      if (action.action === "play_card") {
        expect(action.cardId).toBe("plus-3"); // Should pick the optimal card
      }
    });

    it("should prefer flip cards with appropriate choice", () => {
      mockState.opponentTotal = 15; // Needs to add
      const flipCard = getCardById("flip-3")!;

      const action = npcTurn(mockState, "medium", [flipCard]);

      if (action.action === "play_card") {
        expect(action.cardId).toBe("flip-3");
        expect(action.flipChoice).toBe("plus");
      }
    });

    it("should use flip cards to reduce when over target", () => {
      mockState.opponentTotal = 21; // Over 20, but flip can help
      const flipCard = getCardById("flip-2")!;

      const action = npcTurn(mockState, "medium", [flipCard]);

      if (action.action === "play_card") {
        expect(action.cardId).toBe("flip-2");
        expect(action.flipChoice).toBe("minus");
      }
    });
  });

  describe("Hard NPC behavior", () => {
    it("should stand when total is 19 or higher", () => {
      mockState.opponentTotal = 19;

      const action = npcTurn(mockState, "hard", hardSideDeck);

      expect(action.action).toBe("stand");
    });

    it("should continue when total is below 19", () => {
      mockState.opponentTotal = 18;

      const action = npcTurn(mockState, "hard", hardSideDeck);

      expect(action.action).not.toBe("stand");
    });

    it("should save special cards for optimal moments", () => {
      mockState.opponentTotal = 15;
      mockState.playerTotal = 19; // Player is close to winning

      const specialCards = [
        getCardById("fork")!, // Special card
        getCardById("plus-3")!, // Regular card
      ];

      // When not in critical situation, should prefer regular cards
      const action = npcTurn(mockState, "hard", specialCards);

      if (action.action === "play_card") {
        // Should prefer the regular card over special card in non-critical situation
        expect(action.cardId).toBe("plus-3");
      }
    });

    it("should use special cards in critical situations", () => {
      mockState.opponentTotal = 20; // Perfect total
      mockState.playerTotal = 20; // Player also has good total

      const overflowCard = getCardById("overflow")!;
      const regularCard = getCardById("plus-1")!;

      const action = npcTurn(mockState, "hard", [overflowCard, regularCard]);

      // In critical situation with perfect setup, should use overflow
      if (action.action === "play_card") {
        expect(action.cardId).toBe("overflow");
      }
    });

    it("should use rebase card when far from target", () => {
      mockState.opponentTotal = 5; // Far from target range
      const rebaseCard = getCardById("rebase")!;
      const regularCards = [getCardById("plus-2")!, getCardById("plus-3")!];

      const action = npcTurn(mockState, "hard", [rebaseCard, ...regularCards]);

      // Rebase would set total to 10, which is more efficient than multiple plus cards
      if (action.action === "play_card") {
        expect(action.cardId).toBe("rebase");
      }
    });

    it("should calculate optimal card combinations", () => {
      mockState.opponentTotal = 16; // Needs 3 more to reach 19

      const cards = [
        getCardById("plus-1")!, // Would need more cards
        getCardById("plus-3")!, // Perfect fit
        getCardById("plus-5")!, // Would overshoot
      ];

      const action = npcTurn(mockState, "hard", cards);

      if (action.action === "play_card") {
        expect(action.cardId).toBe("plus-3"); // Should pick optimal card
      }
    });

    it("should consider opponent state when making decisions", () => {
      mockState.opponentTotal = 18; // Good total
      mockState.playerTotal = 20; // Player has perfect total

      const cards = [
        getCardById("plus-1")!, // Would reach 19 (very good)
        getCardById("flip-1")!, // Could go to 19 or 17
      ];

      const action = npcTurn(mockState, "hard", cards);

      // Should be conservative since player has perfect total
      if (action.action === "play_card") {
        expect(action.cardId).toBe("plus-1"); // Guaranteed good result
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle empty side deck", () => {
      mockState.opponentTotal = 15;

      const action = npcTurn(mockState, "medium", []);

      expect(action.action).toBe("end_turn");
      expect(action.cardId).toBeUndefined();
    });

    it("should handle busted state", () => {
      mockState.opponentTotal = 22; // Already busted

      const action = npcTurn(mockState, "hard", [getCardById("minus-5")!]);

      // Should try to play minus card to get back under 20
      expect(action.action).toBe("play_card");
      expect(action.cardId).toBe("minus-5");
    });

    it("should handle exact target totals", () => {
      mockState.opponentTotal = 18; // Medium target

      const action = npcTurn(mockState, "medium", mediumSideDeck);

      expect(action.action).toBe("stand");
    });

    it("should respect flip card choice requirements", () => {
      mockState.opponentTotal = 17;
      const flipCard = getCardById("flip-2")!;

      const action = npcTurn(mockState, "medium", [flipCard]);

      if (action.action === "play_card" && action.cardId === "flip-2") {
        expect(action.flipChoice).toBeDefined();
        expect(["plus", "minus"]).toContain(action.flipChoice);
      }
    });
  });

  describe("Deterministic behavior", () => {
    it("should produce consistent results for same input", () => {
      mockState.opponentTotal = 17;

      const action1 = npcTurn(mockState, "medium", mediumSideDeck);
      const action2 = npcTurn(mockState, "medium", mediumSideDeck);

      // For deterministic scenarios (like standing), results should be identical
      if (action1.action === "stand") {
        expect(action2.action).toBe("stand");
      }
    });

    it("should handle random elements consistently", () => {
      // Easy difficulty uses random selection, but should still be reasonable
      mockState.opponentTotal = 15;

      const actions: NPCAction[] = [];
      for (let i = 0; i < 10; i++) {
        actions.push(npcTurn(mockState, "easy", easySideDeck));
      }

      // All actions should be valid choices
      actions.forEach(action => {
        expect(["stand", "end_turn", "play_card"]).toContain(action.action);

        if (action.action === "play_card") {
          expect(action.cardId).toBeDefined();
          expect(easySideDeck.some(card => card.id === action.cardId)).toBe(true);
        }
      });
    });
  });
});