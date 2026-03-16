/**
 * Zone Choice Modal
 * Auto-opens when GameState has narrative.pendingChoices
 * Shows two zone options, each with name, description, modifier text
 * Click to choose, sends zone_choice via WebSocket
 */

import { openModal, closeModal } from "./modal.js";
import type { WSClient } from "../ws-client.js";
import type { GameStore } from "../store.js";

interface ZoneChoiceOption {
  zoneId: string;
  name: string;
  description: string;
  modifier?: string;
}

export class ZoneChoiceModal {
  private gameStore: GameStore;
  private wsClient: WSClient;
  private unsubscribe?: () => void;
  private isModalOpen = false;

  constructor(gameStore: GameStore, wsClient: WSClient) {
    this.gameStore = gameStore;
    this.wsClient = wsClient;
    this.initializeSubscription();
  }

  /**
   * Initialize subscription to pending choices
   */
  private initializeSubscription(): void {
    this.unsubscribe = this.gameStore.subscribe(
      (state) => (state.narrative as any).pendingChoices,
      (pendingChoices, previousPendingChoices) => {
        if (pendingChoices && !previousPendingChoices && !this.isModalOpen) {
          this.openZoneChoiceModal(pendingChoices);
        }
      }
    );
  }

  /**
   * Open zone choice modal with provided choices
   */
  private openZoneChoiceModal(choices: ZoneChoiceOption[]): void {
    if (choices.length < 2) {
      console.warn("Zone choice modal requires at least 2 options");
      return;
    }

    this.isModalOpen = true;
    const content = this.createModalContent(choices);
    openModal(content);
  }

  /**
   * Create zone choice modal content
   */
  private createModalContent(choices: ZoneChoiceOption[]): HTMLElement {
    const container = document.createElement("div");
    container.className = "zone-choice-modal-content";
    container.style.cssText = `
      padding: 2rem;
      min-width: 500px;
      max-width: 600px;
      text-align: center;
      color: #e2e8f0;
    `;

    // Title
    const title = document.createElement("h2");
    title.textContent = "Choose Your Next Zone";
    title.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    `;

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent = "Your coding journey continues. Choose wisely, Agent...";
    subtitle.style.cssText = `
      margin: 0 0 2rem 0;
      font-size: 1rem;
      color: #cbd5e1;
      font-style: italic;
    `;

    // Zone options container
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "zone-options";
    optionsContainer.style.cssText = `
      display: flex;
      gap: 1.5rem;
      margin-bottom: 2rem;
    `;

    // Create zone option cards
    choices.slice(0, 2).forEach((choice, index) => {
      const optionCard = this.createZoneOptionCard(choice, index);
      optionsContainer.appendChild(optionCard);
    });

    // Footer note
    const footerNote = document.createElement("p");
    footerNote.textContent = "Choose carefully — this will affect your next coding adventure";
    footerNote.style.cssText = `
      margin: 0;
      font-size: 0.875rem;
      color: #64748b;
      font-style: italic;
    `;

    // Assemble content
    container.appendChild(title);
    container.appendChild(subtitle);
    container.appendChild(optionsContainer);
    container.appendChild(footerNote);

    return container;
  }

  /**
   * Create individual zone option card
   */
  private createZoneOptionCard(choice: ZoneChoiceOption, index: number): HTMLElement {
    const card = document.createElement("div");
    card.className = "zone-option-card";
    card.style.cssText = `
      flex: 1;
      background: rgba(30, 41, 59, 0.8);
      border: 2px solid #475569;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
      position: relative;
      overflow: hidden;
    `;

    // Zone name
    const name = document.createElement("h3");
    name.textContent = choice.name;
    name.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #f8fafc;
    `;

    // Zone description
    const description = document.createElement("p");
    description.textContent = choice.description;
    description.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
      color: #cbd5e1;
      line-height: 1.5;
    `;

    // Modifier text (if present)
    if (choice.modifier) {
      const modifier = document.createElement("div");
      modifier.textContent = choice.modifier;
      modifier.className = "zone-modifier";
      modifier.style.cssText = `
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 6px;
        padding: 0.75rem;
        font-size: 0.8rem;
        color: #93c5fd;
        font-weight: 500;
        margin-bottom: 1rem;
      `;
      card.appendChild(modifier);
    }

    // Choice button
    const choiceButton = document.createElement("button");
    choiceButton.textContent = "Enter this Zone";
    choiceButton.className = "zone-choice-button";
    choiceButton.style.cssText = `
      width: 100%;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    // Card hover effects
    card.addEventListener("mouseenter", () => {
      card.style.borderColor = "#3b82f6";
      card.style.backgroundColor = "rgba(30, 41, 59, 0.95)";
      card.style.transform = "translateY(-4px)";
      card.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.2)";

      choiceButton.style.background = "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)";
      choiceButton.style.transform = "translateY(-1px)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.borderColor = "#475569";
      card.style.backgroundColor = "rgba(30, 41, 59, 0.8)";
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";

      choiceButton.style.background = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
      choiceButton.style.transform = "translateY(0)";
    });

    // Click handler for entire card
    const handleChoice = () => {
      this.makeZoneChoice(choice.zoneId, `Selected ${choice.name} from modal`);
    };

    card.addEventListener("click", handleChoice);
    choiceButton.addEventListener("click", (e) => {
      e.stopPropagation();
      handleChoice();
    });

    // Assemble card
    card.appendChild(name);
    card.appendChild(description);
    if (choice.modifier) {
      const modifier = card.querySelector('.zone-modifier');
      if (modifier) {
        card.appendChild(modifier);
      }
    }
    card.appendChild(choiceButton);

    return card;
  }

  /**
   * Make zone choice and send to server
   */
  private makeZoneChoice(zoneId: string, reason?: string): void {
    if (!this.wsClient.isConnected()) {
      console.warn("Cannot make zone choice: WebSocket not connected");
      return;
    }

    // Send zone choice message
    const success = this.wsClient.send({
      type: "zone_choice",
      zoneId,
      reason,
    });

    if (success) {
      console.log(`Zone choice made: ${zoneId}`, reason);
      this.closeModal();
    } else {
      console.error("Failed to send zone choice message");
    }
  }

  /**
   * Close the modal
   */
  private closeModal(): void {
    this.isModalOpen = false;
    closeModal();
  }

  /**
   * Manually open zone choice modal with provided options (for testing)
   */
  openWithChoices(choices: ZoneChoiceOption[]): void {
    this.openZoneChoiceModal(choices);
  }

  /**
   * Clean up subscriptions
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

/**
 * Global instance management
 */
let globalZoneChoiceModal: ZoneChoiceModal | null = null;

/**
 * Initialize zone choice modal
 */
export function initializeZoneChoiceModal(gameStore: GameStore, wsClient: WSClient): ZoneChoiceModal {
  if (globalZoneChoiceModal) {
    globalZoneChoiceModal.destroy();
  }

  globalZoneChoiceModal = new ZoneChoiceModal(gameStore, wsClient);
  return globalZoneChoiceModal;
}

/**
 * Get the global zone choice modal instance
 */
export function getZoneChoiceModal(): ZoneChoiceModal | null {
  return globalZoneChoiceModal;
}