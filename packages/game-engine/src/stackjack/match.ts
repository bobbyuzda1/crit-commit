import type { StackjackCard, StackjackState } from "@crit-commit/shared";
import { calculateCardEffect } from "@crit-commit/shared";

interface MatchInternalState {
  playerTotal: number;
  opponentTotal: number;
  playerSideDeck: StackjackCard[];
  opponentSideDeck: StackjackCard[];
  playerRoundsWon: number;
  opponentRoundsWon: number;
  currentRound: number;
  isPlayerTurn: boolean;
  hasPlayerStood: boolean;
  hasOpponentStood: boolean;
  mainDeckLastDraw: number | null;
  playerHasCritHand: boolean;
  opponentHasCritHand: boolean;
  isActive: boolean;
  phase: "playing" | "round_end" | "match_end";
}

export class StackjackMatch {
  private state: MatchInternalState;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): MatchInternalState {
    return {
      playerTotal: 0,
      opponentTotal: 0,
      playerSideDeck: [],
      opponentSideDeck: [],
      playerRoundsWon: 0,
      opponentRoundsWon: 0,
      currentRound: 1,
      isPlayerTurn: true,
      hasPlayerStood: false,
      hasOpponentStood: false,
      mainDeckLastDraw: null,
      playerHasCritHand: false,
      opponentHasCritHand: false,
      isActive: false,
      phase: "playing"
    };
  }

  public startMatch(playerDeck: StackjackCard[], opponentDeck: StackjackCard[]): void {
    this.state = {
      ...this.getInitialState(),
      playerSideDeck: [...playerDeck],
      opponentSideDeck: [...opponentDeck],
      isActive: true
    };
  }

  public drawMainDeck(): number {
    if (!this.state.isActive) return 0;

    // Random draw from 1-10
    const drawnValue = Math.floor(Math.random() * 10) + 1;
    this.state.mainDeckLastDraw = drawnValue;

    // Add to current player's total if they haven't stood
    if (this.state.isPlayerTurn && !this.state.hasPlayerStood) {
      this.state.playerTotal += drawnValue;
      this.checkForCritHand("player");
    } else if (!this.state.isPlayerTurn && !this.state.hasOpponentStood) {
      this.state.opponentTotal += drawnValue;
      this.checkForCritHand("opponent");
    }

    return drawnValue;
  }

  public playCard(cardId: string, flipChoice?: "plus" | "minus"): boolean {
    if (!this.state.isActive || this.state.phase !== "playing") return false;

    const sideDeck = this.state.isPlayerTurn ? this.state.playerSideDeck : this.state.opponentSideDeck;

    const cardIndex = sideDeck.findIndex(card => card.id === cardId);
    if (cardIndex === -1) return false;

    const card = sideDeck[cardIndex];
    const currentTotal = this.state.isPlayerTurn ? this.state.playerTotal : this.state.opponentTotal;

    // Calculate effect
    const effect = calculateCardEffect(
      card,
      currentTotal,
      flipChoice,
      this.state.mainDeckLastDraw || undefined,
      // For Fork cards, we'd need the opponent's last card - simplified for now
      undefined
    );

    // Apply effect
    if (this.state.isPlayerTurn) {
      this.state.playerTotal += effect;
      this.checkForCritHand("player");
    } else {
      this.state.opponentTotal += effect;
      this.checkForCritHand("opponent");
    }

    // Remove card from side deck (cards are consumed when played)
    sideDeck.splice(cardIndex, 1);

    return true;
  }

  public stand(): void {
    if (!this.state.isActive) return;

    if (this.state.isPlayerTurn) {
      this.state.hasPlayerStood = true;
    } else {
      this.state.hasOpponentStood = true;
    }
  }

  public endTurn(): void {
    if (!this.state.isActive) return;

    // Check for bust
    const currentTotal = this.state.isPlayerTurn ? this.state.playerTotal : this.state.opponentTotal;

    if (currentTotal > 20) {
      // Player busts, opponent wins the round
      if (this.state.isPlayerTurn) {
        this.state.opponentRoundsWon++;
      } else {
        this.state.playerRoundsWon++;
      }
      this.endRound();
      return;
    }

    // If both players have stood, end the round
    if (this.state.hasPlayerStood && this.state.hasOpponentStood) {
      this.resolveRound();
      return;
    }

    // Switch turns
    this.state.isPlayerTurn = !this.state.isPlayerTurn;
  }

  private checkForCritHand(player: "player" | "opponent"): void {
    const total = player === "player" ? this.state.playerTotal : this.state.opponentTotal;

    // Crit Hand is exactly 20 achieved through natural progression (not via special cards)
    // For this basic implementation, we'll consider any exactly 20 as potential Crit Hand
    if (total === 20) {
      if (player === "player") {
        this.state.playerHasCritHand = true;
      } else {
        this.state.opponentHasCritHand = true;
      }
    }
  }

  private resolveRound(): void {
    const playerTotal = this.state.playerTotal;
    const opponentTotal = this.state.opponentTotal;

    // Both players bust
    if (playerTotal > 20 && opponentTotal > 20) {
      // Tie, no one wins the round
    }
    // Player busts, opponent wins
    else if (playerTotal > 20) {
      this.state.opponentRoundsWon++;
    }
    // Opponent busts, player wins
    else if (opponentTotal > 20) {
      this.state.playerRoundsWon++;
    }
    // Both at 20 exactly - check for Crit Hand tiebreaker
    else if (playerTotal === 20 && opponentTotal === 20) {
      if (this.state.playerHasCritHand && !this.state.opponentHasCritHand) {
        this.state.playerRoundsWon++;
      } else if (this.state.opponentHasCritHand && !this.state.playerHasCritHand) {
        this.state.opponentRoundsWon++;
      }
      // If both have Crit Hand or neither do, it's a tie
    }
    // Normal comparison - higher total wins
    else if (playerTotal > opponentTotal) {
      this.state.playerRoundsWon++;
    } else if (opponentTotal > playerTotal) {
      this.state.opponentRoundsWon++;
    }
    // Equal totals that aren't 20 = tie

    this.endRound();
  }

  private endRound(): void {
    // Check if match is complete (first to 3 rounds wins)
    if (this.state.playerRoundsWon >= 3 || this.state.opponentRoundsWon >= 3) {
      this.state.phase = "match_end";
      this.state.isActive = false;
      return;
    }

    // Reset for next round
    this.state.currentRound++;
    this.state.playerTotal = 0;
    this.state.opponentTotal = 0;
    this.state.hasPlayerStood = false;
    this.state.hasOpponentStood = false;
    this.state.mainDeckLastDraw = null;
    this.state.playerHasCritHand = false;
    this.state.opponentHasCritHand = false;
    this.state.isPlayerTurn = true; // Player always starts each round
    this.state.phase = "playing";
  }

  public getState(): StackjackState {
    return {
      isActive: this.state.isActive,
      opponent: undefined, // This would be set by the game engine when starting a match
      playerTotal: this.state.playerTotal,
      opponentTotal: this.state.opponentTotal,
      playerCards: [], // Cards in hand - not used in this basic implementation
      opponentCards: [], // Cards in hand - not used in this basic implementation
      playerSideDeck: [...this.state.playerSideDeck],
      opponentSideDeck: [...this.state.opponentSideDeck],
      playerRoundsWon: this.state.playerRoundsWon,
      opponentRoundsWon: this.state.opponentRoundsWon,
      currentRound: this.state.currentRound,
      isPlayerTurn: this.state.isPlayerTurn,
      hasPlayerStood: this.state.hasPlayerStood,
      hasOpponentStood: this.state.hasOpponentStood,
      gameOver: !this.state.isActive,
      winner: this.getWinner(),
      lastAction: this.getLastAction()
    };
  }

  private getWinner(): "player" | "opponent" | undefined {
    if (!this.state.isActive) {
      if (this.state.playerRoundsWon >= 3) return "player";
      if (this.state.opponentRoundsWon >= 3) return "opponent";
    }
    return undefined;
  }

  private getLastAction(): string {
    if (this.state.mainDeckLastDraw !== null) {
      return `Drew ${this.state.mainDeckLastDraw} from main deck`;
    }
    return "Match started";
  }

  // Expose internal state for testing
  public _getInternalState(): MatchInternalState {
    return { ...this.state };
  }

  // Set internal state for testing
  public _setInternalState(updates: Partial<MatchInternalState>): void {
    this.state = { ...this.state, ...updates };
  }
}