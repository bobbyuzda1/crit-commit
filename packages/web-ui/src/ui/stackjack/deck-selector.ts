/**
 * Stackjack Deck Selector Modal
 * Allows players to select 4 cards from their collection for their side deck
 */

import type { StackjackCard, ClientMessage } from "@crit-commit/shared";
import { CardRenderer } from "./card-renderer.js";

export interface DeckSelectorOptions {
  onSelectionConfirm: (selectedCards: string[]) => void;
  onCancel?: () => void;
}

export class DeckSelector {
  private modal: HTMLElement;
  private backdrop: HTMLElement;
  private selectedCards: Set<string> = new Set();
  private readonly maxCards = 4;
  private confirmButton: HTMLElement;
  private options: DeckSelectorOptions;

  constructor(options: DeckSelectorOptions) {
    this.options = options;
    this.createModal();
  }

  /**
   * Show the deck selector with the player's card collection
   */
  show(availableCards: StackjackCard[]): void {
    this.populateCardGrid(availableCards);
    this.modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  /**
   * Hide the deck selector
   */
  hide(): void {
    this.modal.style.display = "none";
    document.body.style.overflow = ""; // Restore scrolling
    this.selectedCards.clear();
    this.updateConfirmButton();
  }

  /**
   * Create the modal DOM structure
   */
  private createModal(): void {
    // Create backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "deck-selector-backdrop";
    this.backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
    `;

    // Create modal container
    this.modal = document.createElement("div");
    this.modal.className = "deck-selector-modal";
    this.modal.style.cssText = `
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 2px solid #475569;
      border-radius: 12px;
      width: 90vw;
      max-width: 800px;
      height: 80vh;
      max-height: 600px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;

    // Create header
    const header = document.createElement("div");
    header.className = "deck-selector-header";
    header.style.cssText = `
      padding: 1.5rem;
      border-bottom: 1px solid #334155;
      background: rgba(15, 23, 42, 0.6);
    `;

    const title = document.createElement("h2");
    title.textContent = "Select Your Side Deck";
    title.style.cssText = `
      margin: 0;
      color: #f1f5f9;
      font-size: 1.5rem;
      font-weight: bold;
      font-family: "Fira Code", monospace;
    `;

    const subtitle = document.createElement("p");
    subtitle.textContent = `Choose ${this.maxCards} cards for your side deck`;
    subtitle.style.cssText = `
      margin: 0.5rem 0 0 0;
      color: #94a3b8;
      font-size: 0.9rem;
    `;

    header.appendChild(title);
    header.appendChild(subtitle);

    // Create scrollable card grid container
    const cardGridContainer = document.createElement("div");
    cardGridContainer.className = "card-grid-container";
    cardGridContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    `;

    // Create card grid
    const cardGrid = document.createElement("div");
    cardGrid.className = "card-grid";
    cardGrid.id = "deck-selector-grid";
    cardGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 1rem;
      justify-items: center;
    `;

    cardGridContainer.appendChild(cardGrid);

    // Create footer with action buttons
    const footer = document.createElement("div");
    footer.className = "deck-selector-footer";
    footer.style.cssText = `
      padding: 1.5rem;
      border-top: 1px solid #334155;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // Selection counter
    const selectionCounter = document.createElement("div");
    selectionCounter.className = "selection-counter";
    selectionCounter.id = "selection-counter";
    selectionCounter.style.cssText = `
      color: #94a3b8;
      font-size: 0.9rem;
      font-family: "Fira Code", monospace;
    `;

    // Action buttons container
    const actionButtons = document.createElement("div");
    actionButtons.style.cssText = `
      display: flex;
      gap: 1rem;
    `;

    // Cancel button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.className = "cancel-button";
    cancelButton.style.cssText = `
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid #64748b;
      border-radius: 6px;
      color: #94a3b8;
      font-family: "Fira Code", monospace;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    cancelButton.addEventListener("mouseenter", () => {
      cancelButton.style.borderColor = "#94a3b8";
      cancelButton.style.color = "#f1f5f9";
    });

    cancelButton.addEventListener("mouseleave", () => {
      cancelButton.style.borderColor = "#64748b";
      cancelButton.style.color = "#94a3b8";
    });

    cancelButton.addEventListener("click", () => {
      this.hide();
      this.options.onCancel?.();
    });

    // Confirm button
    this.confirmButton = document.createElement("button");
    this.confirmButton.textContent = "Confirm Selection";
    this.confirmButton.className = "confirm-button";
    this.confirmButton.style.cssText = `
      padding: 0.75rem 1.5rem;
      background: #10b981;
      border: none;
      border-radius: 6px;
      color: #ffffff;
      font-family: "Fira Code", monospace;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0.5;
    `;

    this.confirmButton.addEventListener("mouseenter", () => {
      if (!this.confirmButton.disabled) {
        this.confirmButton.style.background = "#059669";
      }
    });

    this.confirmButton.addEventListener("mouseleave", () => {
      if (!this.confirmButton.disabled) {
        this.confirmButton.style.background = "#10b981";
      }
    });

    this.confirmButton.addEventListener("click", () => {
      if (this.selectedCards.size === this.maxCards) {
        const selectedCardIds = Array.from(this.selectedCards);
        this.options.onSelectionConfirm(selectedCardIds);
        this.hide();
      }
    });

    actionButtons.appendChild(cancelButton);
    actionButtons.appendChild(this.confirmButton);

    footer.appendChild(selectionCounter);
    footer.appendChild(actionButtons);

    // Assemble modal
    this.backdrop.appendChild(this.modal);
    this.modal.appendChild(header);
    this.modal.appendChild(cardGridContainer);
    this.modal.appendChild(footer);

    // Add to DOM
    document.body.appendChild(this.backdrop);

    // Close on backdrop click
    this.backdrop.addEventListener("click", (e) => {
      if (e.target === this.backdrop) {
        this.hide();
        this.options.onCancel?.();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal.style.display === "flex") {
        this.hide();
        this.options.onCancel?.();
      }
    });

    this.updateConfirmButton();
    this.updateSelectionCounter();
  }

  /**
   * Populate the card grid with available cards
   */
  private populateCardGrid(cards: StackjackCard[]): void {
    const grid = document.getElementById("deck-selector-grid");
    if (!grid) return;

    // Clear existing cards
    grid.innerHTML = "";

    // Sort cards by rarity and name for better organization
    const sortedCards = [...cards].sort((a, b) => {
      const rarityOrder = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });

    // Create card elements
    sortedCards.forEach(card => {
      const isSelected = this.selectedCards.has(card.id);
      const cardEl = CardRenderer.createCardElement(card, {
        isClickable: true,
        isSelected,
        showTooltip: true,
        scale: 1.2
      });

      // Add click handler
      cardEl.addEventListener("click", () => {
        this.toggleCardSelection(card.id);
      });

      grid.appendChild(cardEl);
    });
  }

  /**
   * Toggle selection of a card
   */
  private toggleCardSelection(cardId: string): void {
    if (this.selectedCards.has(cardId)) {
      // Deselect card
      this.selectedCards.delete(cardId);
    } else if (this.selectedCards.size < this.maxCards) {
      // Select card if not at max
      this.selectedCards.add(cardId);
    } else {
      // At max cards, show feedback
      this.showMaxCardsMessage();
      return;
    }

    // Update UI
    this.updateCardVisuals();
    this.updateConfirmButton();
    this.updateSelectionCounter();
  }

  /**
   * Update visual state of all cards
   */
  private updateCardVisuals(): void {
    const grid = document.getElementById("deck-selector-grid");
    if (!grid) return;

    const cardElements = grid.querySelectorAll(".stackjack-card");
    cardElements.forEach(cardEl => {
      const cardId = (cardEl as HTMLElement).dataset.cardId;
      if (!cardId) return;

      const isSelected = this.selectedCards.has(cardId);

      if (isSelected) {
        cardEl.classList.add("selected");
        (cardEl as HTMLElement).style.borderColor = "#10b981";
        (cardEl as HTMLElement).style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.5)";
      } else {
        cardEl.classList.remove("selected");
        const rarity = (cardEl as HTMLElement).dataset.cardRarity;
        (cardEl as HTMLElement).style.borderColor = this.getRarityBorderColor(rarity || "common");
        (cardEl as HTMLElement).style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
      }
    });
  }

  /**
   * Update confirm button state
   */
  private updateConfirmButton(): void {
    const isReady = this.selectedCards.size === this.maxCards;

    this.confirmButton.disabled = !isReady;
    this.confirmButton.style.opacity = isReady ? "1" : "0.5";
    this.confirmButton.style.cursor = isReady ? "pointer" : "not-allowed";
  }

  /**
   * Update selection counter
   */
  private updateSelectionCounter(): void {
    const counter = document.getElementById("selection-counter");
    if (!counter) return;

    counter.textContent = `${this.selectedCards.size} / ${this.maxCards} cards selected`;
  }

  /**
   * Show temporary message when max cards reached
   */
  private showMaxCardsMessage(): void {
    const counter = document.getElementById("selection-counter");
    if (!counter) return;

    const originalText = counter.textContent;
    counter.textContent = `Maximum ${this.maxCards} cards allowed`;
    counter.style.color = "#ef4444";

    setTimeout(() => {
      counter.textContent = originalText;
      counter.style.color = "#94a3b8";
    }, 2000);
  }

  /**
   * Get border color for rarity (helper method)
   */
  private getRarityBorderColor(rarity: string): string {
    switch (rarity) {
      case "common": return "#64748b";
      case "uncommon": return "#10b981";
      case "rare": return "#3b82f6";
      case "legendary": return "#f59e0b";
      default: return "#64748b";
    }
  }

  /**
   * Cleanup method - call when component is destroyed
   */
  destroy(): void {
    if (this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    document.body.style.overflow = "";
  }
}