/**
 * Event Feed Component
 * Displays scrolling list of narrative events with crit highlighting
 */

import type { NarrativeEvent } from "@crit-commit/shared";
import type { GameStore } from "../store.js";

export class EventFeed {
  private container: HTMLElement;
  private gameStore: GameStore;
  private unsubscribe?: () => void;
  private maxEvents = 50; // Maximum events to display

  constructor(container: HTMLElement, gameStore: GameStore) {
    this.container = container;
    this.gameStore = gameStore;
    this.initialize();
  }

  private initialize(): void {
    // Subscribe to event feed changes
    this.unsubscribe = this.gameStore.subscribeToEvents((events) => {
      this.render(events);
    });

    // Initial render
    const state = this.gameStore.getState();
    this.render(state.eventFeed || []);
  }

  private render(events: NarrativeEvent[]): void {
    // Clear existing content (except header)
    const eventsContainer = this.container.querySelector(".events-content") as HTMLElement;
    if (eventsContainer) {
      eventsContainer.remove();
    }

    // Create main content container
    const content = document.createElement("div");
    content.className = "events-content";
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-right: 0.25rem;
    `;

    // Show recent events first (reverse chronological order)
    const recentEvents = events
      .slice(-this.maxEvents) // Keep only the last N events
      .reverse(); // Show newest first

    if (recentEvents.length === 0) {
      // Show placeholder when no events
      const placeholder = document.createElement("div");
      placeholder.className = "events-placeholder";
      placeholder.style.cssText = `
        text-align: center;
        color: #64748b;
        font-style: italic;
        padding: 2rem 1rem;
        border: 1px dashed #334155;
        border-radius: 6px;
        margin-top: 1rem;
      `;
      placeholder.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📜</div>
        <div>No events yet. Start coding to see your story unfold!</div>
      `;
      content.appendChild(placeholder);
    } else {
      // Group events by date for better organization
      const eventsByDate = this.groupEventsByDate(recentEvents);

      eventsByDate.forEach(({ date, events: dateEvents }) => {
        const dateGroup = this.createDateGroup(date, dateEvents);
        content.appendChild(dateGroup);
      });
    }

    this.container.appendChild(content);

    // Auto-scroll to top when new events are added
    content.scrollTop = 0;
  }

  private groupEventsByDate(events: NarrativeEvent[]): Array<{ date: string, events: NarrativeEvent[] }> {
    const groups = new Map<string, NarrativeEvent[]>();

    events.forEach(event => {
      const date = this.formatEventDate(event.timestamp);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(event);
    });

    return Array.from(groups.entries()).map(([date, events]) => ({ date, events }));
  }

  private createDateGroup(date: string, events: NarrativeEvent[]): HTMLElement {
    const group = document.createElement("div");
    group.className = "event-date-group";
    group.style.cssText = `
      margin-bottom: 1rem;
    `;

    // Date header
    const dateHeader = document.createElement("div");
    dateHeader.className = "event-date-header";
    dateHeader.style.cssText = `
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid #334155;
      text-align: center;
    `;
    dateHeader.textContent = date;
    group.appendChild(dateHeader);

    // Event list
    const eventList = document.createElement("div");
    eventList.className = "event-list";
    eventList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;

    events.forEach(event => {
      const eventElement = this.createEventItem(event);
      eventList.appendChild(eventElement);

      // Add fade-in animation for new events
      setTimeout(() => {
        eventElement.style.opacity = "1";
        eventElement.style.transform = "translateY(0)";
      }, 50);
    });

    group.appendChild(eventList);
    return group;
  }

  private createEventItem(event: NarrativeEvent): HTMLElement {
    const item = document.createElement("div");
    item.className = "event-item";

    // Base styling
    let itemStyle = `
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 0.75rem;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
    `;

    // Special styling for crit events
    if (event.type === "crit") {
      itemStyle += `
        border-color: #f59e0b;
        background: rgba(251, 191, 36, 0.1);
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
      `;
    }

    item.style.cssText = itemStyle;

    // Event type indicator
    const typeIndicator = document.createElement("div");
    typeIndicator.className = "event-type-indicator";
    typeIndicator.style.cssText = `
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    `;

    // Style type indicator based on event type
    const typeStyles = {
      crit: { bg: "rgba(251, 191, 36, 0.2)", color: "#f59e0b", text: "CRIT!" },
      level_up: { bg: "rgba(16, 185, 129, 0.2)", color: "#10b981", text: "LEVEL UP" },
      quest: { bg: "rgba(59, 130, 246, 0.2)", color: "#3b82f6", text: "QUEST" },
      encounter: { bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444", text: "ENCOUNTER" },
      zone_unlock: { bg: "rgba(139, 92, 246, 0.2)", color: "#8b5cf6", text: "ZONE" },
      story: { bg: "rgba(100, 116, 139, 0.2)", color: "#64748b", text: "STORY" }
    };

    const style = typeStyles[event.type] || typeStyles.story;
    typeIndicator.style.backgroundColor = style.bg;
    typeIndicator.style.color = style.color;
    typeIndicator.textContent = style.text;

    // Event title
    const title = document.createElement("div");
    title.className = "event-title";
    title.style.cssText = `
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      padding-right: 4rem; /* Space for type indicator */
      line-height: 1.3;
    `;

    // Special styling for crit event titles
    if (event.type === "crit") {
      title.style.color = "#fbbf24";
      title.style.textShadow = "0 0 10px rgba(251, 191, 36, 0.3)";
    } else {
      title.style.color = "#e2e8f0";
    }

    title.textContent = event.title;

    // Event description
    const description = document.createElement("div");
    description.className = "event-description";
    description.style.cssText = `
      font-size: 0.8125rem;
      color: #94a3b8;
      line-height: 1.4;
      margin-bottom: 0.5rem;
    `;
    description.textContent = event.description;

    // Event timestamp
    const timestamp = document.createElement("div");
    timestamp.className = "event-timestamp";
    timestamp.style.cssText = `
      font-size: 0.75rem;
      color: #64748b;
      font-style: italic;
    `;
    timestamp.textContent = this.formatEventTimestamp(event.timestamp);

    // Assemble event item
    item.appendChild(typeIndicator);
    item.appendChild(title);
    item.appendChild(description);
    item.appendChild(timestamp);

    // Add hover effect
    item.addEventListener("mouseenter", () => {
      if (event.type === "crit") {
        item.style.background = "rgba(251, 191, 36, 0.15)";
        item.style.transform = "scale(1.02)";
      } else {
        item.style.background = "rgba(30, 41, 59, 0.8)";
        item.style.transform = "translateY(-2px)";
      }
    });

    item.addEventListener("mouseleave", () => {
      if (event.type === "crit") {
        item.style.background = "rgba(251, 191, 36, 0.1)";
      } else {
        item.style.background = "rgba(15, 23, 42, 0.6)";
      }
      item.style.transform = "none";
    });

    return item;
  }

  private formatEventDate(timestamp: string): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
    }
  }

  private formatEventTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
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