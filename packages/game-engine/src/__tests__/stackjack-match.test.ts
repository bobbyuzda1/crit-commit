import { describe, it, expect, beforeEach } from "vitest";
import { StackjackMatch } from "../stackjack/match.js";
import { getStarterDeck, getCardById } from "@crit-commit/shared";
import type { StackjackCard } from "@crit-commit/shared";

describe("StackjackMatch", () => {
  let match: StackjackMatch;
  let playerDeck: StackjackCard[];
  let opponentDeck: StackjackCard[];

  beforeEach(() => {
    match = new StackjackMatch();
    playerDeck = getStarterDeck();
    opponentDeck = getStarterDeck();
  });

  describe("Match initialization", () => {
    it("should start a match with correct initial state", () => {
      match.startMatch(playerDeck, opponentDeck);
      const state = match.getState();

      expect(state.isActive).toBe(true);
      expect(state.playerTotal).toBe(0);
      expect(state.opponentTotal).toBe(0);
      expect(state.playerRoundsWon).toBe(0);
      expect(state.opponentRoundsWon).toBe(0);
      expect(state.currentRound).toBe(1);
      expect(state.isPlayerTurn).toBe(true);
      expect(state.hasPlayerStood).toBe(false);
      expect(state.hasOpponentStood).toBe(false);
      expect(state.playerSideDeck).toEqual(playerDeck);
      expect(state.opponentSideDeck).toEqual(opponentDeck);
    });
  });

  describe("Main deck drawing", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should draw random cards between 1-10 from main deck", () => {
      for (let i = 0; i < 10; i++) {
        const card = match.drawMainDeck();
        expect(card).toBeGreaterThanOrEqual(1);
        expect(card).toBeLessThanOrEqual(10);
      }
    });

    it("should add main deck card to player total", () => {
      const initialState = match.getState();
      const drawnValue = match.drawMainDeck();
      const newState = match.getState();

      expect(newState.playerTotal).toBe(initialState.playerTotal + drawnValue);
    });
  });

  describe("Card playing", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should apply plus card effects correctly", () => {
      const plusCard = getCardById("plus-2")!;
      const initialTotal = match.getState().playerTotal;

      match.playCard(plusCard.id);
      const newState = match.getState();

      expect(newState.playerTotal).toBe(initialTotal + 2);
    });

    it("should apply minus card effects correctly", () => {
      // Set up a scenario with some points first
      match.drawMainDeck(); // Add some points
      const beforeMinus = match.getState().playerTotal;

      const minusCard = getCardById("minus-1")!;
      match.playCard(minusCard.id);
      const newState = match.getState();

      expect(newState.playerTotal).toBe(beforeMinus - 1);
    });

    it("should handle flip cards with plus choice", () => {
      const flipCard = getCardById("flip-2")!;
      const initialTotal = match.getState().playerTotal;

      match.playCard(flipCard.id, "plus");
      const newState = match.getState();

      expect(newState.playerTotal).toBe(initialTotal + 2);
    });

    it("should handle flip cards with minus choice", () => {
      // Set up scenario with points first
      match.drawMainDeck();
      const beforeFlip = match.getState().playerTotal;

      const flipCard = getCardById("flip-1")!;
      match.playCard(flipCard.id, "minus");
      const newState = match.getState();

      expect(newState.playerTotal).toBe(beforeFlip - 1);
    });
  });

  describe("Standing mechanics", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should lock player total when standing", () => {
      match.drawMainDeck();
      const totalBeforeStand = match.getState().playerTotal;

      match.stand();
      const stateAfterStand = match.getState();

      expect(stateAfterStand.hasPlayerStood).toBe(true);
      expect(stateAfterStand.playerTotal).toBe(totalBeforeStand);

      // Try to draw more cards - total should not change
      match.drawMainDeck();
      const finalState = match.getState();
      expect(finalState.playerTotal).toBe(totalBeforeStand);
    });
  });

  describe("Busting mechanics", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should detect bust when total exceeds 20", () => {
      // Manually set high total for testing
      match._setInternalState({ playerTotal: 25 });

      expect(match.getState().playerTotal).toBe(25);
      // Player should lose the round when they bust
      match.endTurn();
      const newState = match.getState();
      expect(newState.opponentRoundsWon).toBe(1);
    });
  });

  describe("Round and match completion", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should win match after winning 3 rounds", () => {
      // Simulate winning 3 rounds
      for (let i = 0; i < 3; i++) {
        // Set player to exactly 20 (Crit Hand)
        match._setInternalState({
          playerTotal: 20,
          opponentTotal: 19,
          hasPlayerStood: true,
          hasOpponentStood: true
        });
        match.endTurn();
      }

      const finalState = match.getState();
      expect(finalState.playerRoundsWon).toBe(3);
      expect(finalState.isActive).toBe(false);
    });

    it("should lose match after losing 3 rounds", () => {
      // Simulate losing 3 rounds
      for (let i = 0; i < 3; i++) {
        // Set opponent to win
        match._setInternalState({
          playerTotal: 18,
          opponentTotal: 20,
          hasPlayerStood: true,
          hasOpponentStood: true
        });
        match.endTurn();
      }

      const finalState = match.getState();
      expect(finalState.opponentRoundsWon).toBe(3);
      expect(finalState.isActive).toBe(false);
    });
  });

  describe("Crit Hand mechanics", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should recognize Crit Hand (exactly 20) beats non-Crit 20", () => {
      // Player gets exactly 20 (Crit Hand)
      match._setInternalState({
        playerTotal: 20,
        playerHasCritHand: true,
        opponentTotal: 20,
        opponentHasCritHand: false,
        hasPlayerStood: true,
        hasOpponentStood: true
      });

      match.endTurn();
      const state = match.getState();

      // Player should win the round due to Crit Hand tiebreaker
      expect(state.playerRoundsWon).toBe(1);
      expect(state.opponentRoundsWon).toBe(0);
    });

    it("should tie when both players have Crit Hand", () => {
      // Both players get exactly 20 as Crit Hand
      match._setInternalState({
        playerTotal: 20,
        playerHasCritHand: true,
        opponentTotal: 20,
        opponentHasCritHand: true,
        hasPlayerStood: true,
        hasOpponentStood: true
      });

      match.endTurn();
      const state = match.getState();

      // Should be a tie, no rounds won
      expect(state.playerRoundsWon).toBe(0);
      expect(state.opponentRoundsWon).toBe(0);
      expect(state.currentRound).toBe(2); // Round advances even on tie
    });
  });

  describe("Turn management", () => {
    beforeEach(() => {
      match.startMatch(playerDeck, opponentDeck);
    });

    it("should switch turns properly", () => {
      expect(match.getState().isPlayerTurn).toBe(true);

      match.endTurn();
      expect(match.getState().isPlayerTurn).toBe(false);

      match.endTurn();
      expect(match.getState().isPlayerTurn).toBe(true);
    });
  });
});