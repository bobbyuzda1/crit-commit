import { describe, it, expect, beforeEach } from "vitest";
import { applyCardEffect } from "../stackjack/card-effects.js";
import { getCardById } from "@crit-commit/shared";
import type { StackjackCard } from "@crit-commit/shared";

// Mock match state for testing
interface MockMatchState {
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

describe("Special Card Effects", () => {
  let mockState: MockMatchState;

  beforeEach(() => {
    mockState = {
      playerTotal: 15,
      opponentTotal: 12,
      playerSideDeck: [],
      opponentSideDeck: [],
      mainDeckLastDraw: 7,
      opponentLastDraw: 5,
      mainDrawHistory: [3, 8, 7],
      isPlayerTurn: true,
      critNextCard: false,
    };
  });

  describe("Fork card", () => {
    it("should copy opponent's last main deck draw", () => {
      const forkCard = getCardById("fork")!;
      mockState.opponentLastDraw = 6;

      const newState = applyCardEffect(mockState, forkCard);

      expect(newState.playerTotal).toBe(21); // 15 + 6
      expect(newState.opponentLastDraw).toBe(6); // Unchanged
    });

    it("should have no effect if opponent hasn't drawn", () => {
      const forkCard = getCardById("fork")!;
      mockState.opponentLastDraw = null;

      const newState = applyCardEffect(mockState, forkCard);

      expect(newState.playerTotal).toBe(15); // No change
    });
  });

  describe("Null card", () => {
    it("should cancel current main deck draw", () => {
      const nullCard = getCardById("null")!;
      mockState.mainDeckLastDraw = 8;
      mockState.playerTotal = 18; // Would have been 10 + 8

      const newState = applyCardEffect(mockState, nullCard);

      expect(newState.playerTotal).toBe(10); // 18 - 8 (nullifies the draw)
      expect(newState.mainDeckLastDraw).toBe(0); // Draw becomes 0
    });

    it("should have no effect if no main card was drawn", () => {
      const nullCard = getCardById("null")!;
      mockState.mainDeckLastDraw = null;

      const newState = applyCardEffect(mockState, nullCard);

      expect(newState.playerTotal).toBe(15); // No change
    });
  });

  describe("Rebase card", () => {
    it("should reset player total to 10", () => {
      const rebaseCard = getCardById("rebase")!;
      mockState.playerTotal = 18;

      const newState = applyCardEffect(mockState, rebaseCard);

      expect(newState.playerTotal).toBe(10);
    });

    it("should work when player total is less than 10", () => {
      const rebaseCard = getCardById("rebase")!;
      mockState.playerTotal = 5;

      const newState = applyCardEffect(mockState, rebaseCard);

      expect(newState.playerTotal).toBe(10);
    });

    it("should work when player total is already 10", () => {
      const rebaseCard = getCardById("rebase")!;
      mockState.playerTotal = 10;

      const newState = applyCardEffect(mockState, rebaseCard);

      expect(newState.playerTotal).toBe(10);
    });
  });

  describe("Merge card", () => {
    it("should average last two main deck draws", () => {
      const mergeCard = getCardById("merge")!;
      mockState.mainDrawHistory = [5, 8, 3]; // Last two are 8 and 3
      mockState.playerTotal = 16; // Would have been 5 + 8 + 3

      const newState = applyCardEffect(mockState, mergeCard);

      // Average of 8 and 3 is 5.5, rounded down is 5
      // So we remove 8 + 3 = 11, add back 5, net effect is -6
      expect(newState.playerTotal).toBe(10); // 16 - 6
      expect(newState.mainDrawHistory).toEqual([5, 5]); // Last two replaced with average
    });

    it("should handle edge case with only one draw", () => {
      const mergeCard = getCardById("merge")!;
      mockState.mainDrawHistory = [7];
      mockState.playerTotal = 7;

      const newState = applyCardEffect(mockState, mergeCard);

      // With only one draw, merge has no effect
      expect(newState.playerTotal).toBe(7);
      expect(newState.mainDrawHistory).toEqual([7]);
    });

    it("should handle empty draw history", () => {
      const mergeCard = getCardById("merge")!;
      mockState.mainDrawHistory = [];
      mockState.playerTotal = 0;

      const newState = applyCardEffect(mockState, mergeCard);

      expect(newState.playerTotal).toBe(0);
      expect(newState.mainDrawHistory).toEqual([]);
    });
  });

  describe("Recursive card", () => {
    it("should play a random non-Recursive non-Legendary bonus card", () => {
      const recursiveCard = getCardById("recursive")!;
      mockState.playerSideDeck = [
        getCardById("plus-2")!,
        getCardById("flip-3")!,
        getCardById("minus-1")!,
      ];

      const newState = applyCardEffect(mockState, recursiveCard);

      // Should have played one of the side deck cards
      expect(newState.playerSideDeck.length).toBe(2); // One card consumed

      // Total should have changed based on the bonus card played
      expect(newState.playerTotal).not.toBe(15);

      // Should not equal the original total since a bonus card was applied
      const possibleTotals = [17, 18, 14]; // +2, +3, -1 from original 15
      expect(possibleTotals).toContain(newState.playerTotal);
    });

    it("should have no effect if no eligible bonus cards available", () => {
      const recursiveCard = getCardById("recursive")!;
      mockState.playerSideDeck = [
        getCardById("recursive")!, // Another recursive - not eligible
        getCardById("crit-card")!, // Legendary - not eligible
      ];

      const newState = applyCardEffect(mockState, recursiveCard);

      expect(newState.playerTotal).toBe(15); // No change
      expect(newState.playerSideDeck.length).toBe(2); // No cards consumed
    });
  });

  describe("Crit Card", () => {
    it("should set flag to double next card value", () => {
      const critCard = getCardById("crit-card")!;

      const newState = applyCardEffect(mockState, critCard);

      expect(newState.critNextCard).toBe(true);
      expect(newState.playerTotal).toBe(15); // No immediate effect on total
    });

    it("should double the effect of the next card played", () => {
      const plusCard = getCardById("plus-3")!;
      mockState.critNextCard = true;

      const newState = applyCardEffect(mockState, plusCard);

      expect(newState.playerTotal).toBe(21); // 15 + (3 * 2)
      expect(newState.critNextCard).toBe(false); // Flag consumed
    });

    it("should double flip card effects", () => {
      const flipCard = getCardById("flip-2")!;
      mockState.critNextCard = true;

      const newStatePositive = applyCardEffect(mockState, flipCard, "plus");
      expect(newStatePositive.playerTotal).toBe(19); // 15 + (2 * 2)

      // Reset and test negative
      mockState.critNextCard = true;
      const newStateNegative = applyCardEffect(mockState, flipCard, "minus");
      expect(newStateNegative.playerTotal).toBe(11); // 15 - (2 * 2)
    });
  });

  describe("Overflow card", () => {
    it("should bust opponent when player total is exactly 20", () => {
      const overflowCard = getCardById("overflow")!;
      mockState.playerTotal = 20;
      mockState.opponentTotal = 18;

      const newState = applyCardEffect(mockState, overflowCard);

      expect(newState.opponentTotal).toBe(21); // Busted
      expect(newState.playerTotal).toBe(20); // Unchanged
    });

    it("should have no effect when player total is not exactly 20", () => {
      const overflowCard = getCardById("overflow")!;
      mockState.playerTotal = 19;
      mockState.opponentTotal = 18;

      const newState = applyCardEffect(mockState, overflowCard);

      expect(newState.opponentTotal).toBe(18); // No change
      expect(newState.playerTotal).toBe(19); // No change
    });

    it("should have no effect when player total is over 20", () => {
      const overflowCard = getCardById("overflow")!;
      mockState.playerTotal = 21;
      mockState.opponentTotal = 18;

      const newState = applyCardEffect(mockState, overflowCard);

      expect(newState.opponentTotal).toBe(18); // No change
    });
  });

  describe("Flip choice handling", () => {
    it("should respect flip choice for flip cards", () => {
      const flipCard = getCardById("flip-4")!;

      const positiveState = applyCardEffect(mockState, flipCard, "plus");
      expect(positiveState.playerTotal).toBe(19); // 15 + 4

      const negativeState = applyCardEffect(mockState, flipCard, "minus");
      expect(negativeState.playerTotal).toBe(11); // 15 - 4
    });

    it("should default to positive for flip cards without choice", () => {
      const flipCard = getCardById("flip-3")!;

      const newState = applyCardEffect(mockState, flipCard);
      expect(newState.playerTotal).toBe(18); // 15 + 3 (defaults to plus)
    });
  });

  describe("Card effect immutability", () => {
    it("should not mutate the original state", () => {
      const rebaseCard = getCardById("rebase")!;
      const originalTotal = mockState.playerTotal;
      const originalDeckLength = mockState.playerSideDeck.length;

      applyCardEffect(mockState, rebaseCard);

      // Original state should be unchanged
      expect(mockState.playerTotal).toBe(originalTotal);
      expect(mockState.playerSideDeck.length).toBe(originalDeckLength);
    });
  });
});