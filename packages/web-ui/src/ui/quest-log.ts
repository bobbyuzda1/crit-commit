/**
 * Quest Log Component
 * Shows micro-quests, session quests, and epic quests with progress bars
 */

import type { Quest, GameState } from "@crit-commit/shared";
import type { GameStore } from "../store.js";

export class QuestLog {
  private container: HTMLElement;
  private gameStore: GameStore;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement, gameStore: GameStore) {
    this.container = container;
    this.gameStore = gameStore;
    this.initialize();
  }

  private initialize(): void {
    // Subscribe to quest changes
    this.unsubscribe = this.gameStore.subscribeToQuests((quests) => {
      this.render(quests);
    });

    // Initial render
    const state = this.gameStore.getState();
    this.render(state.quests || { activeQuests: [], completedQuests: [], availableQuests: [] });
  }

  private render(quests: GameState["quests"]): void {
    // Clear existing content (except header)
    const questsContainer = this.container.querySelector(".quests-content") as HTMLElement;
    if (questsContainer) {
      questsContainer.remove();
    }

    // Create main content container
    const content = document.createElement("div");
    content.className = "quests-content";
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    `;

    // Group quests by type
    const microQuests = quests.activeQuests.filter(q => q.type === "micro");
    const sessionQuests = quests.activeQuests.filter(q => q.type === "session");
    const epicQuests = quests.activeQuests.filter(q => q.type === "epic");

    // Render quest sections
    if (microQuests.length > 0) {
      content.appendChild(this.createQuestSection("Micro Quests", microQuests, "🔄"));
    }

    if (sessionQuests.length > 0) {
      content.appendChild(this.createQuestSection("Session Quests", sessionQuests, "⚔️"));
    }

    if (epicQuests.length > 0) {
      content.appendChild(this.createQuestSection("Epic Quests", epicQuests, "🏰"));
    }

    // Show available quests
    if (quests.availableQuests && quests.availableQuests.length > 0) {
      content.appendChild(this.createAvailableQuestsSection(quests.availableQuests));
    }

    // If no active quests, show a placeholder
    if (quests.activeQuests.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.className = "quest-placeholder";
      placeholder.style.cssText = `
        text-align: center;
        color: #64748b;
        font-style: italic;
        padding: 2rem 1rem;
        border: 1px dashed #334155;
        border-radius: 6px;
        margin-top: 1rem;
      `;
      placeholder.textContent = "No active quests. Start coding to generate quests!";
      content.appendChild(placeholder);
    }

    this.container.appendChild(content);
  }

  private createQuestSection(title: string, quests: Quest[], icon: string): HTMLElement {
    const section = document.createElement("div");
    section.className = "quest-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.4);
      border-radius: 6px;
      padding: 0.75rem;
      border-left: 3px solid #3b82f6;
    `;

    // Section header
    const header = document.createElement("div");
    header.className = "quest-section-header";
    header.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    header.innerHTML = `<span>${icon}</span><span>${title}</span><span style="color: #64748b; font-weight: normal;">(${quests.length})</span>`;
    section.appendChild(header);

    // Quest list
    const questList = document.createElement("div");
    questList.className = "quest-list";
    questList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;

    quests.forEach(quest => {
      questList.appendChild(this.createQuestItem(quest));
    });

    section.appendChild(questList);
    return section;
  }

  private createQuestItem(quest: Quest): HTMLElement {
    const item = document.createElement("div");
    item.className = "quest-item";
    item.style.cssText = `
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 0.75rem;
      transition: background 0.2s ease;
      cursor: pointer;
    `;

    // Quest header with title and XP reward
    const header = document.createElement("div");
    header.className = "quest-header";
    header.style.cssText = `
      display: flex;
      justify-content: between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    `;

    const title = document.createElement("div");
    title.className = "quest-title";
    title.style.cssText = `
      font-size: 0.875rem;
      font-weight: 500;
      color: #e2e8f0;
      flex: 1;
      line-height: 1.4;
    `;
    title.textContent = quest.title;

    const xpReward = document.createElement("div");
    xpReward.className = "quest-xp";
    xpReward.style.cssText = `
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 600;
      margin-left: 0.5rem;
      flex-shrink: 0;
    `;
    xpReward.textContent = `+${quest.xpReward} XP`;

    header.appendChild(title);
    header.appendChild(xpReward);

    // Quest description
    const description = document.createElement("div");
    description.className = "quest-description";
    description.style.cssText = `
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    `;
    description.textContent = quest.description;

    // Progress bar
    const progressContainer = this.createProgressBar(quest.progress, quest.maxProgress);

    // Assemble quest item
    item.appendChild(header);
    item.appendChild(description);
    item.appendChild(progressContainer);

    // Add hover effect
    item.addEventListener("mouseenter", () => {
      item.style.background = "rgba(30, 41, 59, 0.8)";
    });

    item.addEventListener("mouseleave", () => {
      item.style.background = "rgba(15, 23, 42, 0.6)";
    });

    return item;
  }

  private createProgressBar(current: number, max: number): HTMLElement {
    const container = document.createElement("div");
    container.className = "progress-container";
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;

    // Progress bar background
    const progressBg = document.createElement("div");
    progressBg.className = "progress-bg";
    progressBg.style.cssText = `
      flex: 1;
      height: 8px;
      background: #1e293b;
      border-radius: 4px;
      border: 1px solid #334155;
      overflow: hidden;
    `;

    // Progress bar fill
    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    const percentage = max > 0 ? (current / max) * 100 : 0;
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      width: ${percentage}%;
      transition: width 0.3s ease;
      border-radius: 2px;
    `;

    progressBg.appendChild(progressFill);

    // Progress text
    const progressText = document.createElement("div");
    progressText.className = "progress-text";
    progressText.style.cssText = `
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
      min-width: 3rem;
      text-align: right;
    `;
    progressText.textContent = `${current}/${max}`;

    container.appendChild(progressBg);
    container.appendChild(progressText);

    return container;
  }

  private createAvailableQuestsSection(availableQuests: Quest[]): HTMLElement {
    const section = document.createElement("div");
    section.className = "available-quests-section";
    section.style.cssText = `
      background: rgba(51, 65, 85, 0.2);
      border-radius: 6px;
      padding: 0.75rem;
      border-left: 3px solid #64748b;
      border: 1px dashed #334155;
    `;

    const header = document.createElement("div");
    header.className = "available-quests-header";
    header.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    header.innerHTML = `<span>💡</span><span>Available Quests</span><span style="color: #64748b; font-weight: normal;">(${availableQuests.length})</span>`;

    const questList = document.createElement("div");
    questList.className = "available-quest-list";
    questList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    `;

    availableQuests.slice(0, 3).forEach(quest => { // Show only first 3
      const item = document.createElement("div");
      item.className = "available-quest-item";
      item.style.cssText = `
        font-size: 0.75rem;
        color: #64748b;
        padding: 0.25rem 0;
        cursor: pointer;
        transition: color 0.2s ease;
      `;
      item.textContent = `• ${quest.title} (+${quest.xpReward} XP)`;

      item.addEventListener("mouseenter", () => {
        item.style.color = "#94a3b8";
      });

      item.addEventListener("mouseleave", () => {
        item.style.color = "#64748b";
      });

      questList.appendChild(item);
    });

    if (availableQuests.length > 3) {
      const more = document.createElement("div");
      more.style.cssText = `
        font-size: 0.75rem;
        color: #64748b;
        font-style: italic;
        text-align: center;
        padding: 0.25rem 0;
      `;
      more.textContent = `... and ${availableQuests.length - 3} more`;
      questList.appendChild(more);
    }

    section.appendChild(header);
    section.appendChild(questList);
    return section;
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