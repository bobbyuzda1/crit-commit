/**
 * Stackjack Card Renderer
 * DOM-based card components with interactive features
 */

import type { StackjackCard, CardType, ItemRarity } from "@crit-commit/shared";

export interface CardRenderOptions {
  isClickable?: boolean;
  isSelected?: boolean;
  showTooltip?: boolean;
  scale?: number;
}

export class CardRenderer {
  /**
   * Create a DOM element representing a Stackjack card
   */
  static createCardElement(card: StackjackCard, options: CardRenderOptions = {}): HTMLElement {
    const {
      isClickable = false,
      isSelected = false,
      showTooltip = true,
      scale = 1
    } = options;

    // Create card container
    const cardEl = document.createElement("div");
    cardEl.className = `stackjack-card ${card.type} ${card.rarity}${isSelected ? " selected" : ""}`;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.cardType = card.type;
    cardEl.dataset.cardRarity = card.rarity;

    // Base card styles
    const baseWidth = 80;
    const baseHeight = 120;
    cardEl.style.cssText = `
      width: ${baseWidth * scale}px;
      height: ${baseHeight * scale}px;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border: 2px solid ${this.getRarityBorderColor(card.rarity)};
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      cursor: ${isClickable ? "pointer" : "default"};
      transition: all 0.2s ease;
      position: relative;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      font-family: "Fira Code", monospace;
      font-size: ${12 * scale}px;
      text-align: center;
      user-select: none;
    `;

    // Add hover effects for clickable cards
    if (isClickable) {
      cardEl.style.transform = `scale(${scale})`;
      cardEl.addEventListener("mouseenter", () => {
        cardEl.style.transform = `scale(${scale * 1.05})`;
        cardEl.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.4)";
      });
      cardEl.addEventListener("mouseleave", () => {
        cardEl.style.transform = `scale(${scale})`;
        cardEl.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
      });
    }

    // Add selected state styling
    if (isSelected) {
      cardEl.style.borderColor = "#10b981";
      cardEl.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.5)";
    }

    // Card name at top
    const nameEl = document.createElement("div");
    nameEl.className = "card-name";
    nameEl.textContent = card.name;
    nameEl.style.cssText = `
      font-weight: bold;
      color: #f1f5f9;
      font-size: ${10 * scale}px;
      margin-bottom: ${4 * scale}px;
    `;

    // Type color indicator
    const typeIndicator = document.createElement("div");
    typeIndicator.className = "type-indicator";
    typeIndicator.style.cssText = `
      width: ${20 * scale}px;
      height: ${4 * scale}px;
      background: ${this.getTypeColor(card.type)};
      border-radius: 2px;
      margin-bottom: ${8 * scale}px;
    `;

    // Card value (if applicable)
    const valueEl = document.createElement("div");
    valueEl.className = "card-value";
    if (card.value !== undefined) {
      valueEl.textContent = card.value.toString();
      valueEl.style.cssText = `
        font-size: ${18 * scale}px;
        font-weight: bold;
        color: #f1f5f9;
        margin-bottom: ${8 * scale}px;
      `;
    } else {
      valueEl.style.display = "none";
    }

    // Assemble card
    cardEl.appendChild(nameEl);
    cardEl.appendChild(typeIndicator);
    cardEl.appendChild(valueEl);

    // Add tooltip if enabled
    if (showTooltip) {
      this.addTooltip(cardEl, card);
    }

    return cardEl;
  }

  /**
   * Get border color for card rarity
   */
  private static getRarityBorderColor(rarity: ItemRarity): string {
    switch (rarity) {
      case "common":
        return "#64748b";  // Gray
      case "uncommon":
        return "#10b981";  // Green
      case "rare":
        return "#3b82f6";  // Blue
      case "legendary":
        return "#f59e0b";  // Gold
      default:
        return "#64748b";
    }
  }

  /**
   * Get color for card type indicator
   */
  private static getTypeColor(type: CardType): string {
    switch (type) {
      case "plus":
        return "#10b981";  // Green
      case "minus":
        return "#ef4444";  // Red
      case "flip":
        return "#8b5cf6";  // Purple
      case "fork":
        return "#f59e0b";  // Orange
      case "null":
        return "#6b7280";  // Gray
      case "rebase":
        return "#06b6d4";  // Cyan
      case "merge":
        return "#8b5cf6";  // Purple
      case "recursive":
        return "#f97316";  // Orange
      case "crit":
        return "#dc2626";  // Bright Red
      case "overflow":
        return "#7c3aed";  // Violet
      default:
        return "#64748b";
    }
  }

  /**
   * Add tooltip to card element
   */
  private static addTooltip(cardEl: HTMLElement, card: StackjackCard): void {
    // Create tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "card-tooltip";
    tooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      color: #f1f5f9;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      max-width: 200px;
      white-space: normal;
      text-align: left;
    `;

    // Tooltip content
    let tooltipText = card.description;
    if (card.effect) {
      tooltipText += `\n\n${card.effect}`;
    }
    tooltip.innerHTML = tooltipText.replace(/\n/g, "<br>");

    // Add tooltip to DOM
    document.body.appendChild(tooltip);

    // Show/hide tooltip on hover
    cardEl.addEventListener("mouseenter", (e) => {
      const rect = cardEl.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
      tooltip.style.opacity = "1";
    });

    cardEl.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });

    // Clean up tooltip when card is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === cardEl && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
            observer.disconnect();
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Create a card back element (for hidden cards)
   */
  static createCardBackElement(options: CardRenderOptions = {}): HTMLElement {
    const { scale = 1 } = options;

    const cardBack = document.createElement("div");
    cardBack.className = "stackjack-card-back";

    const baseWidth = 80;
    const baseHeight = 120;
    cardBack.style.cssText = `
      width: ${baseWidth * scale}px;
      height: ${baseHeight * scale}px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 2px solid #334155;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Fira Code", monospace;
      font-size: ${24 * scale}px;
      color: #475569;
      font-weight: bold;
      user-select: none;
    `;

    cardBack.textContent = "?";

    return cardBack;
  }
}