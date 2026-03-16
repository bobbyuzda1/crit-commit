/**
 * Dashboard Layout Manager
 * Creates three-column DOM layout: quest log | event feed | stats panel
 */

export class Dashboard {
  private container: HTMLElement;
  private questLogContainer: HTMLElement;
  private eventFeedContainer: HTMLElement;
  private statsPanelContainer: HTMLElement;

  constructor(containerSelector: string) {
    const element = document.querySelector(containerSelector);
    if (!element) {
      throw new Error(`Dashboard container "${containerSelector}" not found`);
    }

    this.container = element as HTMLElement;
    this.initializeLayout();
  }

  private initializeLayout(): void {
    // Clear any existing content
    this.container.innerHTML = "";

    // Create main dashboard wrapper
    const dashboardWrapper = document.createElement("div");
    dashboardWrapper.className = "dashboard-wrapper";
    dashboardWrapper.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-gap: 1rem;
      height: 100%;
      padding: 1rem;
      overflow: hidden;
    `;

    // Create quest log container (left column)
    this.questLogContainer = document.createElement("div");
    this.questLogContainer.className = "quest-log-container";
    this.questLogContainer.id = "quest-log";
    this.questLogContainer.style.cssText = `
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    // Create event feed container (center column)
    this.eventFeedContainer = document.createElement("div");
    this.eventFeedContainer.className = "event-feed-container";
    this.eventFeedContainer.id = "event-feed";
    this.eventFeedContainer.style.cssText = `
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    // Create stats panel container (right column)
    this.statsPanelContainer = document.createElement("div");
    this.statsPanelContainer.className = "stats-panel-container";
    this.statsPanelContainer.id = "stats-panel";
    this.statsPanelContainer.style.cssText = `
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    // Add headers for each section
    this.addSectionHeader(this.questLogContainer, "Quest Log", "📋");
    this.addSectionHeader(this.eventFeedContainer, "Event Feed", "📜");
    this.addSectionHeader(this.statsPanelContainer, "Character Stats", "👤");

    // Assemble the layout
    dashboardWrapper.appendChild(this.questLogContainer);
    dashboardWrapper.appendChild(this.eventFeedContainer);
    dashboardWrapper.appendChild(this.statsPanelContainer);
    this.container.appendChild(dashboardWrapper);
  }

  private addSectionHeader(container: HTMLElement, title: string, icon: string): void {
    const header = document.createElement("div");
    header.className = "section-header";
    header.style.cssText = `
      font-weight: 600;
      font-size: 1rem;
      color: #e2e8f0;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #475569;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;

    header.innerHTML = `<span>${icon}</span><span>${title}</span>`;
    container.appendChild(header);
  }

  /**
   * Get container element for quest log
   */
  getQuestLogContainer(): HTMLElement {
    return this.questLogContainer;
  }

  /**
   * Get container element for event feed
   */
  getEventFeedContainer(): HTMLElement {
    return this.eventFeedContainer;
  }

  /**
   * Get container element for stats panel
   */
  getStatsPanelContainer(): HTMLElement {
    return this.statsPanelContainer;
  }

  /**
   * Destroy the dashboard and clean up
   */
  destroy(): void {
    this.container.innerHTML = "";
  }
}