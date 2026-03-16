/**
 * Stats Panel Component
 * Displays character stats, XP bar, class badge, inventory, and connection status
 */

import type { Character, GameState, InventoryItem, Materia } from "@crit-commit/shared";
import type { GameStore } from "../store.js";

export class StatsPanel {
  private container: HTMLElement;
  private gameStore: GameStore;
  private characterUnsubscribe?: () => void;
  private inventoryUnsubscribe?: () => void;
  private connectionStatus: "connected" | "connecting" | "disconnected" | "failed" = "disconnected";

  constructor(container: HTMLElement, gameStore: GameStore) {
    this.container = container;
    this.gameStore = gameStore;
    this.initialize();
  }

  private initialize(): void {
    // Subscribe to character changes
    this.characterUnsubscribe = this.gameStore.subscribeToCharacter((character) => {
      this.renderCharacterInfo(character);
    });

    // Subscribe to inventory changes
    this.inventoryUnsubscribe = this.gameStore.subscribeToInventory((inventory) => {
      this.renderInventoryInfo(inventory);
    });

    // Initial render
    const state = this.gameStore.getState();
    this.render(state);
  }

  private render(state: GameState): void {
    // Clear existing content (except header)
    const statsContainer = this.container.querySelector(".stats-content") as HTMLElement;
    if (statsContainer) {
      statsContainer.remove();
    }

    // Create main content container
    const content = document.createElement("div");
    content.className = "stats-content";
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-right: 0.25rem;
    `;

    // Character info section
    const characterSection = this.createCharacterSection(state.character);
    content.appendChild(characterSection);

    // XP progress section
    const xpSection = this.createXPSection(state.character);
    content.appendChild(xpSection);

    // Materia section
    const materiaSection = this.createMateriaSection(state.materiaCollection || [], state.equippedMateria || []);
    content.appendChild(materiaSection);

    // Gear section
    const gearSection = this.createGearSection(state.inventory || []);
    content.appendChild(gearSection);

    // Connection status section
    const connectionSection = this.createConnectionSection();
    content.appendChild(connectionSection);

    this.container.appendChild(content);
  }

  private renderCharacterInfo(character: Character): void {
    const existingSection = this.container.querySelector(".character-section") as HTMLElement;
    if (existingSection) {
      const newSection = this.createCharacterSection(character);
      existingSection.replaceWith(newSection);
    }

    const existingXPSection = this.container.querySelector(".xp-section") as HTMLElement;
    if (existingXPSection) {
      const newXPSection = this.createXPSection(character);
      existingXPSection.replaceWith(newXPSection);
    }
  }

  private renderInventoryInfo(inventory: InventoryItem[]): void {
    const existingSection = this.container.querySelector(".gear-section") as HTMLElement;
    if (existingSection) {
      const newSection = this.createGearSection(inventory);
      existingSection.replaceWith(newSection);
    }
  }

  private createCharacterSection(character: Character): HTMLElement {
    const section = document.createElement("div");
    section.className = "character-section stats-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      padding: 1rem;
      border-left: 3px solid #3b82f6;
    `;

    // Character name and level
    const nameLevel = document.createElement("div");
    nameLevel.className = "character-name-level";
    nameLevel.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    `;

    const name = document.createElement("div");
    name.className = "character-name";
    name.style.cssText = `
      font-size: 1.125rem;
      font-weight: 700;
      color: #e2e8f0;
    `;
    name.textContent = character.name;

    const level = document.createElement("div");
    level.className = "character-level";
    level.style.cssText = `
      font-size: 1rem;
      font-weight: 600;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    `;
    level.textContent = `Level ${character.level}`;

    nameLevel.appendChild(name);
    nameLevel.appendChild(level);

    // Class badge and ascension stars
    const classInfo = document.createElement("div");
    classInfo.className = "character-class-info";
    classInfo.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    `;

    const classBadge = this.createClassBadge(character.class);
    const ascensionStars = this.createAscensionStars(character.ascensionLevel || 0);

    classInfo.appendChild(classBadge);
    classInfo.appendChild(ascensionStars);

    // Stats grid
    const statsGrid = document.createElement("div");
    statsGrid.className = "stats-grid";
    statsGrid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      font-size: 0.875rem;
    `;

    // Crit chance
    const critChance = this.createStatItem("Crit Chance", `${(character.critChance * 100).toFixed(1)}%`, "#f59e0b");
    const xpBonus = this.createStatItem("XP Bonus", `+${((character.xpBonus - 1) * 100).toFixed(0)}%`, "#10b981");

    statsGrid.appendChild(critChance);
    statsGrid.appendChild(xpBonus);

    section.appendChild(nameLevel);
    section.appendChild(classInfo);
    section.appendChild(statsGrid);

    return section;
  }

  private createClassBadge(characterClass: string): HTMLElement {
    const badge = document.createElement("div");
    badge.className = "class-badge";

    const classColors = {
      architect: { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
      scout: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
      artificer: { bg: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", border: "rgba(139, 92, 246, 0.3)" },
      battlemage: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" }
    };

    const colors = classColors[characterClass as keyof typeof classColors] || classColors.architect;

    badge.style.cssText = `
      background: ${colors.bg};
      color: ${colors.color};
      border: 1px solid ${colors.border};
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    `;

    badge.textContent = characterClass;
    return badge;
  }

  private createAscensionStars(ascensionLevel: number): HTMLElement {
    const container = document.createElement("div");
    container.className = "ascension-stars";
    container.style.cssText = `
      display: flex;
      gap: 0.125rem;
      align-items: center;
    `;

    for (let i = 0; i < Math.min(ascensionLevel, 5); i++) {
      const star = document.createElement("span");
      star.style.cssText = `
        color: #fbbf24;
        font-size: 1rem;
        text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
      `;
      star.textContent = "★";
      container.appendChild(star);
    }

    if (ascensionLevel === 0) {
      const placeholder = document.createElement("span");
      placeholder.style.cssText = `
        color: #64748b;
        font-size: 0.75rem;
        font-style: italic;
      `;
      placeholder.textContent = "No ascension";
      container.appendChild(placeholder);
    }

    return container;
  }

  private createXPSection(character: Character): HTMLElement {
    const section = document.createElement("div");
    section.className = "xp-section stats-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      padding: 1rem;
      border-left: 3px solid #10b981;
    `;

    const header = document.createElement("div");
    header.className = "section-title";
    header.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    header.innerHTML = `<span>⚡</span><span>Experience</span>`;

    // XP Progress bar
    const xpProgress = this.createXPProgressBar(character.xp, character.xpToNext);

    section.appendChild(header);
    section.appendChild(xpProgress);

    return section;
  }

  private createXPProgressBar(currentXP: number, xpToNext: number): HTMLElement {
    const container = document.createElement("div");
    container.className = "xp-progress-container";

    // XP numbers
    const xpNumbers = document.createElement("div");
    xpNumbers.style.cssText = `
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    `;
    xpNumbers.innerHTML = `
      <span>XP: ${currentXP.toLocaleString()}</span>
      <span>Next: ${xpToNext.toLocaleString()}</span>
    `;

    // Progress bar
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      width: 100%;
      height: 12px;
      background: #1e293b;
      border-radius: 6px;
      border: 1px solid #334155;
      overflow: hidden;
      position: relative;
    `;

    const progressFill = document.createElement("div");
    const totalXP = currentXP + xpToNext;
    const percentage = totalXP > 0 ? (currentXP / totalXP) * 100 : 0;

    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      width: ${percentage}%;
      transition: width 0.5s ease;
      border-radius: 4px;
      position: relative;
    `;

    // Add glow effect
    if (percentage > 80) {
      progressFill.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.4)";
    }

    progressBar.appendChild(progressFill);

    container.appendChild(xpNumbers);
    container.appendChild(progressBar);

    return container;
  }

  private createMateriaSection(materiaCollection: Materia[], equippedMateria: Materia[]): HTMLElement {
    const section = document.createElement("div");
    section.className = "materia-section stats-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      padding: 1rem;
      border-left: 3px solid #8b5cf6;
    `;

    const header = document.createElement("div");
    header.className = "section-title";
    header.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    header.innerHTML = `<span>💎</span><span>Materia (${equippedMateria.length}/8)</span>`;

    if (equippedMateria.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.style.cssText = `
        text-align: center;
        color: #64748b;
        font-style: italic;
        padding: 1rem;
        border: 1px dashed #334155;
        border-radius: 4px;
      `;
      placeholder.textContent = "No materia equipped";
      section.appendChild(header);
      section.appendChild(placeholder);
    } else {
      const materiaGrid = document.createElement("div");
      materiaGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.25rem;
      `;

      equippedMateria.slice(0, 8).forEach(materia => {
        const materiaSlot = this.createMateriaSlot(materia);
        materiaGrid.appendChild(materiaSlot);
      });

      section.appendChild(header);
      section.appendChild(materiaGrid);
    }

    return section;
  }

  private createMateriaSlot(materia: Materia): HTMLElement {
    const slot = document.createElement("div");
    slot.className = "materia-slot";

    const typeColors = {
      skill: "#10b981",    // Green
      tool: "#f59e0b",     // Yellow
      spirit: "#ef4444"    // Red
    };

    const color = typeColors[materia.type as keyof typeof typeColors] || "#64748b";

    slot.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${color}20;
      border: 2px solid ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: ${color};
      position: relative;
      cursor: pointer;
    `;

    slot.textContent = materia.level.toString();
    slot.title = `${materia.name} (Level ${materia.level})`;

    return slot;
  }

  private createGearSection(inventory: InventoryItem[]): HTMLElement {
    const section = document.createElement("div");
    section.className = "gear-section stats-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      padding: 1rem;
      border-left: 3px solid #f59e0b;
    `;

    const equippedGear = inventory.filter(item => item.isEquipped && item.type === "gear");

    const header = document.createElement("div");
    header.className = "section-title";
    header.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    header.innerHTML = `<span>⚔️</span><span>Equipped Gear (${equippedGear.length})</span>`;

    if (equippedGear.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.style.cssText = `
        text-align: center;
        color: #64748b;
        font-style: italic;
        padding: 1rem;
        border: 1px dashed #334155;
        border-radius: 4px;
      `;
      placeholder.textContent = "No gear equipped";
      section.appendChild(header);
      section.appendChild(placeholder);
    } else {
      const gearList = document.createElement("div");
      gearList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      `;

      equippedGear.forEach(gear => {
        const gearItem = this.createGearItem(gear);
        gearList.appendChild(gearItem);
      });

      section.appendChild(header);
      section.appendChild(gearList);
    }

    return section;
  }

  private createGearItem(gear: InventoryItem): HTMLElement {
    const item = document.createElement("div");
    item.className = "gear-item";
    item.style.cssText = `
      font-size: 0.75rem;
      color: #e2e8f0;
      padding: 0.25rem 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const rarityColors = {
      common: "#94a3b8",
      uncommon: "#10b981",
      rare: "#3b82f6",
      legendary: "#f59e0b"
    };

    const color = rarityColors[gear.rarity as keyof typeof rarityColors] || "#94a3b8";

    item.innerHTML = `
      <span style="color: ${color};">${gear.name}</span>
      <span style="color: #64748b; text-transform: capitalize;">${gear.rarity}</span>
    `;

    return item;
  }

  private createConnectionSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "connection-section stats-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      padding: 1rem;
      border-left: 3px solid #64748b;
    `;

    const header = document.createElement("div");
    header.className = "section-title";
    header.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    header.innerHTML = `<span>🔗</span><span>Connection</span>`;

    const status = document.createElement("div");
    status.className = "connection-status";
    status.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    `;

    const dot = document.createElement("div");
    dot.className = "status-dot";
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
    `;

    const text = document.createElement("span");
    text.style.color = "#94a3b8";
    text.textContent = "Connected to game server";

    status.appendChild(dot);
    status.appendChild(text);

    section.appendChild(header);
    section.appendChild(status);

    return section;
  }

  private createStatItem(label: string, value: string, color: string): HTMLElement {
    const item = document.createElement("div");
    item.className = "stat-item";
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
    `;

    const labelSpan = document.createElement("span");
    labelSpan.style.color = "#94a3b8";
    labelSpan.textContent = label;

    const valueSpan = document.createElement("span");
    valueSpan.style.cssText = `
      color: ${color};
      font-weight: 600;
    `;
    valueSpan.textContent = value;

    item.appendChild(labelSpan);
    item.appendChild(valueSpan);

    return item;
  }

  /**
   * Update connection status
   */
  setConnectionStatus(status: "connected" | "connecting" | "disconnected" | "failed"): void {
    this.connectionStatus = status;

    const statusDot = this.container.querySelector(".status-dot") as HTMLElement;
    const statusText = this.container.querySelector(".connection-status span") as HTMLElement;

    if (statusDot && statusText) {
      const statusConfig = {
        connected: { color: "#10b981", text: "Connected to game server" },
        connecting: { color: "#f59e0b", text: "Connecting to server..." },
        disconnected: { color: "#64748b", text: "Disconnected" },
        failed: { color: "#ef4444", text: "Connection failed" }
      };

      const config = statusConfig[status];
      statusDot.style.background = config.color;
      statusText.textContent = config.text;
      statusText.style.color = config.color;
    }
  }

  /**
   * Clean up subscriptions
   */
  destroy(): void {
    if (this.characterUnsubscribe) {
      this.characterUnsubscribe();
    }
    if (this.inventoryUnsubscribe) {
      this.inventoryUnsubscribe();
    }
  }
}