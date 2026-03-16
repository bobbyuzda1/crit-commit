/**
 * Stackjack Match UI
 * Full match interface with player totals, side cards, action buttons, and WebSocket integration
 */

import type {
  StackjackCard,
  StackjackMatchState,
  StackjackAction,
  ClientMessage
} from "@crit-commit/shared";
import { CardRenderer } from "./card-renderer.js";
import { DeckSelector } from "./deck-selector.js";

export interface StackjackUIOptions {
  containerSelector: string;
  onSendMessage: (message: ClientMessage) => void;
}

export interface MatchUpdateData {
  matchState: StackjackMatchState;
  playerCards: StackjackCard[];
  availableSideCards: StackjackCard[];
  lastAction?: string;
  roundResult?: {
    winner: "player" | "opponent" | "tie";
    message: string;
  };
}

export class StackjackUI {
  private container: HTMLElement;
  private matchContainer: HTMLElement;
  private deckSelector: DeckSelector;
  private onSendMessage: (message: ClientMessage) => void;

  // UI Components
  private playerTotalDisplay: HTMLElement;
  private opponentTotalDisplay: HTMLElement;
  private sideCardsContainer: HTMLElement;
  private mainDeckArea: HTMLElement;
  private roundIndicators: HTMLElement[] = [];
  private actionButtons: Map<string, HTMLElement> = new Map();
  private phaseIndicator: HTMLElement;
  private gameStatusDisplay: HTMLElement;

  // State
  private currentMatch?: StackjackMatchState;
  private playerCards: StackjackCard[] = [];
  private availableSideCards: StackjackCard[] = [];
  private selectedSideDeck: string[] = [];
  private isFlipCardActive = false;
  private flipChoice: "plus" | "minus" | undefined;

  constructor(options: StackjackUIOptions) {
    const element = document.querySelector(options.containerSelector);
    if (!element) {
      throw new Error(`Stackjack UI container "${options.containerSelector}" not found`);
    }

    this.container = element as HTMLElement;
    this.onSendMessage = options.onSendMessage;

    this.initializeUI();
    this.initializeDeckSelector();
  }

  /**
   * Initialize the main UI structure
   */
  private initializeUI(): void {
    this.container.innerHTML = "";
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: "Fira Code", monospace;
    `;

    // Create match container
    this.matchContainer = document.createElement("div");
    this.matchContainer.className = "stackjack-match";
    this.matchContainer.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 12px;
      overflow: hidden;
      margin: 1rem;
      border: 2px solid #334155;
    `;

    // Create UI sections
    this.createGameHeader();
    this.createPlayingField();
    this.createActionArea();

    this.container.appendChild(this.matchContainer);

    // Initially hide match UI until game starts
    this.showStartScreen();
  }

  /**
   * Create the game header with round indicators and phase display
   */
  private createGameHeader(): void {
    const header = document.createElement("div");
    header.className = "game-header";
    header.style.cssText = `
      padding: 1.5rem;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // Round indicators (3 circles)
    const roundsContainer = document.createElement("div");
    roundsContainer.className = "rounds-container";
    roundsContainer.style.cssText = `
      display: flex;
      gap: 1rem;
      align-items: center;
    `;

    const roundsLabel = document.createElement("span");
    roundsLabel.textContent = "Rounds:";
    roundsLabel.style.cssText = `
      color: #94a3b8;
      font-size: 0.9rem;
      margin-right: 0.5rem;
    `;

    const roundIndicatorsContainer = document.createElement("div");
    roundIndicatorsContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
    `;

    // Create 3 round indicator dots
    for (let i = 0; i < 3; i++) {
      const indicator = document.createElement("div");
      indicator.className = `round-indicator round-${i + 1}`;
      indicator.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid #475569;
        background: transparent;
        transition: all 0.3s ease;
      `;
      this.roundIndicators.push(indicator);
      roundIndicatorsContainer.appendChild(indicator);
    }

    roundsContainer.appendChild(roundsLabel);
    roundsContainer.appendChild(roundIndicatorsContainer);

    // Phase indicator
    this.phaseIndicator = document.createElement("div");
    this.phaseIndicator.className = "phase-indicator";
    this.phaseIndicator.style.cssText = `
      color: #f1f5f9;
      font-size: 1.1rem;
      font-weight: bold;
      text-align: center;
      padding: 0.5rem 1rem;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid #3b82f6;
      border-radius: 6px;
    `;

    // Game status
    this.gameStatusDisplay = document.createElement("div");
    this.gameStatusDisplay.className = "game-status";
    this.gameStatusDisplay.style.cssText = `
      color: #94a3b8;
      font-size: 0.9rem;
      text-align: right;
    `;

    header.appendChild(roundsContainer);
    header.appendChild(this.phaseIndicator);
    header.appendChild(this.gameStatusDisplay);

    this.matchContainer.appendChild(header);
  }

  /**
   * Create the main playing field with totals and card areas
   */
  private createPlayingField(): void {
    const playingField = document.createElement("div");
    playingField.className = "playing-field";
    playingField.style.cssText = `
      flex: 1;
      display: grid;
      grid-template-rows: 1fr auto 1fr;
      gap: 2rem;
      padding: 2rem;
    `;

    // Opponent area
    const opponentArea = this.createPlayerArea("opponent", true);

    // Main deck area (center)
    this.mainDeckArea = document.createElement("div");
    this.mainDeckArea.className = "main-deck-area";
    this.mainDeckArea.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(30, 41, 59, 0.4);
      border: 2px dashed #475569;
      border-radius: 8px;
      min-height: 80px;
      position: relative;
    `;

    const deckLabel = document.createElement("div");
    deckLabel.textContent = "Main Deck";
    deckLabel.style.cssText = `
      color: #64748b;
      font-size: 0.9rem;
    `;
    this.mainDeckArea.appendChild(deckLabel);

    // Player area
    const playerArea = this.createPlayerArea("player", false);

    playingField.appendChild(opponentArea);
    playingField.appendChild(this.mainDeckArea);
    playingField.appendChild(playerArea);

    this.matchContainer.appendChild(playingField);
  }

  /**
   * Create a player area (opponent or player)
   */
  private createPlayerArea(type: "player" | "opponent", isOpponent: boolean): HTMLElement {
    const area = document.createElement("div");
    area.className = `${type}-area`;
    area.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: rgba(30, 41, 59, 0.3);
      border-radius: 8px;
      border: 1px solid #334155;
    `;

    // Total display
    const totalContainer = document.createElement("div");
    totalContainer.className = `${type}-total-container`;
    totalContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
    `;

    const totalLabel = document.createElement("div");
    totalLabel.textContent = isOpponent ? "Opponent" : "You";
    totalLabel.style.cssText = `
      color: #94a3b8;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    `;

    const totalDisplay = document.createElement("div");
    totalDisplay.className = `${type}-total`;
    totalDisplay.textContent = "0";
    totalDisplay.style.cssText = `
      font-size: 3rem;
      font-weight: bold;
      color: ${isOpponent ? "#ef4444" : "#10b981"};
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    `;

    if (type === "player") {
      this.playerTotalDisplay = totalDisplay;
    } else {
      this.opponentTotalDisplay = totalDisplay;
    }

    totalContainer.appendChild(totalLabel);
    totalContainer.appendChild(totalDisplay);

    // Cards container
    const cardsContainer = document.createElement("div");
    cardsContainer.className = `${type}-cards`;
    cardsContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
      align-items: center;
    `;

    if (type === "player") {
      // Player's side deck cards (show actual cards)
      this.sideCardsContainer = cardsContainer;
    } else {
      // Opponent's cards (show card backs)
      for (let i = 0; i < 4; i++) {
        const cardBack = CardRenderer.createCardBackElement({ scale: 0.8 });
        cardsContainer.appendChild(cardBack);
      }
    }

    area.appendChild(totalContainer);
    area.appendChild(cardsContainer);

    return area;
  }

  /**
   * Create action area with buttons
   */
  private createActionArea(): void {
    const actionArea = document.createElement("div");
    actionArea.className = "action-area";
    actionArea.style.cssText = `
      padding: 1.5rem;
      background: rgba(15, 23, 42, 0.6);
      border-top: 1px solid #334155;
      display: flex;
      justify-content: center;
      gap: 1rem;
    `;

    // Create action buttons
    this.createActionButton("end-turn", "End Turn", "#3b82f6", () => {
      this.sendAction({ type: "end_turn" });
    });

    this.createActionButton("stand", "Stand", "#059669", () => {
      this.sendAction({ type: "stand" });
    });

    // Flip choice buttons (initially hidden)
    this.createActionButton("flip-plus", "+", "#10b981", () => {
      this.selectFlipChoice("plus");
    });

    this.createActionButton("flip-minus", "-", "#ef4444", () => {
      this.selectFlipChoice("minus");
    });

    // Add buttons to action area
    this.actionButtons.forEach(button => {
      actionArea.appendChild(button);
    });

    this.matchContainer.appendChild(actionArea);

    // Initially hide flip buttons
    this.hideFlipChoiceButtons();
  }

  /**
   * Create an action button
   */
  private createActionButton(
    id: string,
    text: string,
    color: string,
    onClick: () => void
  ): void {
    const button = document.createElement("button");
    button.id = `stackjack-${id}`;
    button.className = "stackjack-action-button";
    button.textContent = text;
    button.style.cssText = `
      padding: 1rem 2rem;
      background: ${color};
      border: none;
      border-radius: 6px;
      color: white;
      font-family: "Fira Code", monospace;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    `;

    button.addEventListener("mouseenter", () => {
      if (!button.disabled) {
        button.style.transform = "translateY(-2px)";
        button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
      }
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "none";
    });

    button.addEventListener("click", onClick);

    this.actionButtons.set(id, button);
  }

  /**
   * Initialize deck selector
   */
  private initializeDeckSelector(): void {
    this.deckSelector = new DeckSelector({
      onSelectionConfirm: (selectedCards: string[]) => {
        this.selectedSideDeck = selectedCards;
        // TODO: Send start_match action with selected side deck
        console.log("Side deck selected:", selectedCards);
      },
      onCancel: () => {
        console.log("Deck selection cancelled");
      }
    });
  }

  /**
   * Show start screen before match begins
   */
  private showStartScreen(): void {
    const startScreen = document.createElement("div");
    startScreen.className = "start-screen";
    startScreen.style.cssText = `
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
    `;

    const title = document.createElement("h1");
    title.textContent = "Stackjack";
    title.style.cssText = `
      color: #f1f5f9;
      font-size: 3rem;
      margin-bottom: 2rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    `;

    const subtitle = document.createElement("p");
    subtitle.textContent = "Choose your opponent to begin";
    subtitle.style.cssText = `
      color: #94a3b8;
      font-size: 1.2rem;
      margin-bottom: 3rem;
    `;

    const selectDeckButton = document.createElement("button");
    selectDeckButton.textContent = "Select Side Deck";
    selectDeckButton.style.cssText = `
      padding: 1rem 2rem;
      background: #10b981;
      border: none;
      border-radius: 6px;
      color: white;
      font-family: "Fira Code", monospace;
      font-size: 1.1rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    selectDeckButton.addEventListener("click", () => {
      this.deckSelector.show(this.availableSideCards);
    });

    startScreen.appendChild(title);
    startScreen.appendChild(subtitle);
    startScreen.appendChild(selectDeckButton);

    this.matchContainer.innerHTML = "";
    this.matchContainer.appendChild(startScreen);
  }

  /**
   * Update the UI with new match state
   */
  updateMatch(data: MatchUpdateData): void {
    this.currentMatch = data.matchState;
    this.playerCards = data.playerCards;
    this.availableSideCards = data.availableSideCards;

    // If match just started, rebuild UI
    if (data.matchState.isActive && this.matchContainer.querySelector('.start-screen')) {
      this.initializeUI();
    }

    this.updateTotals();
    this.updateRoundIndicators();
    this.updatePhaseIndicator();
    this.updatePlayerCards();
    this.updateActionButtons();
    this.updateGameStatus();

    // Handle round results
    if (data.roundResult) {
      this.showRoundResult(data.roundResult);
    }
  }

  /**
   * Update player and opponent totals
   */
  private updateTotals(): void {
    if (!this.currentMatch) return;

    this.playerTotalDisplay.textContent = this.currentMatch.playerTotal.toString();
    this.opponentTotalDisplay.textContent = this.currentMatch.opponentTotal.toString();

    // Color coding based on total
    const playerColor = this.currentMatch.playerTotal > 21 ? "#ef4444" :
                       this.currentMatch.playerTotal === 20 ? "#f59e0b" : "#10b981";
    const opponentColor = this.currentMatch.opponentTotal > 21 ? "#ef4444" :
                         this.currentMatch.opponentTotal === 20 ? "#f59e0b" : "#10b981";

    this.playerTotalDisplay.style.color = playerColor;
    this.opponentTotalDisplay.style.color = opponentColor;
  }

  /**
   * Update round indicator dots
   */
  private updateRoundIndicators(): void {
    if (!this.currentMatch) return;

    this.roundIndicators.forEach((indicator, index) => {
      if (index < this.currentMatch!.playerRoundsWon) {
        // Player won this round
        indicator.style.background = "#10b981";
        indicator.style.borderColor = "#10b981";
      } else if (index < this.currentMatch!.opponentRoundsWon) {
        // Opponent won this round
        indicator.style.background = "#ef4444";
        indicator.style.borderColor = "#ef4444";
      } else {
        // Round not yet played
        indicator.style.background = "transparent";
        indicator.style.borderColor = "#475569";
      }
    });
  }

  /**
   * Update phase indicator text
   */
  private updatePhaseIndicator(): void {
    if (!this.currentMatch) return;

    let phaseText = "";
    if (this.currentMatch.gameOver) {
      phaseText = `Game Over - ${this.currentMatch.playerRoundsWon > this.currentMatch.opponentRoundsWon ? "You Won!" : "You Lost!"}`;
      this.phaseIndicator.style.borderColor = this.currentMatch.playerRoundsWon > this.currentMatch.opponentRoundsWon ? "#10b981" : "#ef4444";
    } else if (this.currentMatch.isPlayerTurn) {
      phaseText = "Your Turn";
      this.phaseIndicator.style.borderColor = "#10b981";
    } else {
      phaseText = "Opponent's Turn";
      this.phaseIndicator.style.borderColor = "#ef4444";
    }

    this.phaseIndicator.textContent = phaseText;
  }

  /**
   * Update player's side cards display
   */
  private updatePlayerCards(): void {
    if (!this.sideCardsContainer) return;

    this.sideCardsContainer.innerHTML = "";

    this.playerCards.forEach(card => {
      const cardEl = CardRenderer.createCardElement(card, {
        isClickable: this.canPlayCard(card),
        showTooltip: true,
        scale: 0.9
      });

      if (this.canPlayCard(card)) {
        cardEl.addEventListener("click", () => {
          this.playCard(card);
        });
      }

      this.sideCardsContainer.appendChild(cardEl);
    });
  }

  /**
   * Update action button states
   */
  private updateActionButtons(): void {
    if (!this.currentMatch) return;

    const canAct = this.currentMatch.isActive &&
                   this.currentMatch.isPlayerTurn &&
                   !this.currentMatch.gameOver;

    // End Turn button
    const endTurnButton = this.actionButtons.get("end-turn");
    if (endTurnButton) {
      endTurnButton.disabled = !canAct;
      endTurnButton.style.opacity = canAct ? "1" : "0.5";
    }

    // Stand button
    const standButton = this.actionButtons.get("stand");
    if (standButton) {
      standButton.disabled = !canAct || this.currentMatch.hasPlayerStood;
      standButton.style.opacity = canAct && !this.currentMatch.hasPlayerStood ? "1" : "0.5";
    }
  }

  /**
   * Update game status display
   */
  private updateGameStatus(): void {
    if (!this.currentMatch) return;

    let statusText = `Round ${this.currentMatch.currentRound + 1}`;
    if (this.currentMatch.playerSideCardsRemaining !== undefined) {
      statusText += ` • ${this.currentMatch.playerSideCardsRemaining} cards left`;
    }

    this.gameStatusDisplay.textContent = statusText;
  }

  /**
   * Show round result notification
   */
  private showRoundResult(result: { winner: string; message: string }): void {
    const notification = document.createElement("div");
    notification.className = "round-result-notification";
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid ${result.winner === "player" ? "#10b981" : "#ef4444"};
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      z-index: 1001;
      animation: fadeInOut 3s ease-in-out forwards;
    `;

    const winnerText = document.createElement("div");
    winnerText.textContent = result.winner === "player" ? "Round Won!" :
                            result.winner === "opponent" ? "Round Lost!" : "Round Tied!";
    winnerText.style.cssText = `
      font-size: 1.5rem;
      font-weight: bold;
      color: ${result.winner === "player" ? "#10b981" : "#ef4444"};
      margin-bottom: 0.5rem;
    `;

    const messageText = document.createElement("div");
    messageText.textContent = result.message;
    messageText.style.cssText = `
      color: #94a3b8;
      font-size: 1rem;
    `;

    notification.appendChild(winnerText);
    notification.appendChild(messageText);
    document.body.appendChild(notification);

    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Check if a card can be played
   */
  private canPlayCard(card: StackjackCard): boolean {
    if (!this.currentMatch) return false;

    return this.currentMatch.isActive &&
           this.currentMatch.isPlayerTurn &&
           !this.currentMatch.gameOver &&
           this.currentMatch.canPlaySideCard;
  }

  /**
   * Play a card
   */
  private playCard(card: StackjackCard): void {
    if (card.type === "flip") {
      // Show flip choice buttons
      this.showFlipChoiceButtons(card.id);
    } else {
      // Play card immediately
      this.sendAction({
        type: "play_side_card",
        cardId: card.id
      });
    }
  }

  /**
   * Show flip choice buttons for flip cards
   */
  private showFlipChoiceButtons(cardId: string): void {
    this.isFlipCardActive = true;

    const flipPlusButton = this.actionButtons.get("flip-plus");
    const flipMinusButton = this.actionButtons.get("flip-minus");

    if (flipPlusButton && flipMinusButton) {
      flipPlusButton.style.display = "block";
      flipMinusButton.style.display = "block";
      flipPlusButton.dataset.cardId = cardId;
      flipMinusButton.dataset.cardId = cardId;
    }

    // Hide other action buttons temporarily
    this.actionButtons.get("end-turn")!.style.display = "none";
    this.actionButtons.get("stand")!.style.display = "none";
  }

  /**
   * Hide flip choice buttons
   */
  private hideFlipChoiceButtons(): void {
    this.isFlipCardActive = false;

    const flipPlusButton = this.actionButtons.get("flip-plus");
    const flipMinusButton = this.actionButtons.get("flip-minus");

    if (flipPlusButton && flipMinusButton) {
      flipPlusButton.style.display = "none";
      flipMinusButton.style.display = "none";
    }

    // Show other action buttons
    this.actionButtons.get("end-turn")!.style.display = "block";
    this.actionButtons.get("stand")!.style.display = "block";
  }

  /**
   * Select flip choice and play the flip card
   */
  private selectFlipChoice(choice: "plus" | "minus"): void {
    const flipPlusButton = this.actionButtons.get("flip-plus");
    const cardId = flipPlusButton?.dataset.cardId;

    if (cardId) {
      this.sendAction({
        type: "play_side_card",
        cardId,
        flipChoice: choice
      });
    }

    this.hideFlipChoiceButtons();
  }

  /**
   * Send a Stackjack action via WebSocket
   */
  private sendAction(action: StackjackAction): void {
    this.onSendMessage({
      type: "stackjack_action",
      action
    });
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.deckSelector?.destroy();
  }
}