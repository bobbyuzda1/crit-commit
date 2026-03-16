/**
 * World Map Panel
 * Accessible from a "Map" button
 * Shows Cloud City Base Camp (center), unlocked zones as labeled nodes, archived zones grayed
 * Current zone highlighted, click to travel (updates currentZoneId)
 */

import { openModal, closeModal } from "./modal.js";
import type { WSClient } from "../ws-client.js";
import type { GameStore } from "../store.js";
import type { GameState, Zone } from "@crit-commit/shared";

interface MapPosition {
  x: number;
  y: number;
}

export class WorldMapModal {
  private gameStore: GameStore;
  private wsClient: WSClient;
  private currentGameState?: GameState;

  constructor(gameStore: GameStore, wsClient: WSClient) {
    this.gameStore = gameStore;
    this.wsClient = wsClient;
  }

  /**
   * Open the world map modal
   */
  open(): void {
    this.currentGameState = this.gameStore.getState();
    const content = this.createMapContent();
    openModal(content);
  }

  /**
   * Create world map modal content
   */
  private createMapContent(): HTMLElement {
    const container = document.createElement("div");
    container.className = "world-map-modal-content";
    container.style.cssText = `
      padding: 2rem;
      min-width: 700px;
      max-width: 900px;
      min-height: 500px;
      color: #e2e8f0;
    `;

    // Title
    const title = document.createElement("h2");
    title.textContent = "World Map";
    title.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent = "Navigate your coding journey across the Cloud City archipelago";
    subtitle.style.cssText = `
      margin: 0 0 2rem 0;
      font-size: 1rem;
      color: #cbd5e1;
      text-align: center;
      font-style: italic;
    `;

    // Map container
    const mapContainer = document.createElement("div");
    mapContainer.className = "world-map-container";
    mapContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 400px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      border: 2px solid #475569;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 1rem;
    `;

    // Create map nodes
    this.createMapNodes(mapContainer);

    // Legend
    const legend = this.createLegend();

    // Travel instructions
    const instructions = document.createElement("p");
    instructions.textContent = "Click on any unlocked zone to travel there";
    instructions.style.cssText = `
      margin: 1rem 0 0 0;
      font-size: 0.875rem;
      color: #64748b;
      text-align: center;
      font-style: italic;
    `;

    // Assemble content
    container.appendChild(title);
    container.appendChild(subtitle);
    container.appendChild(mapContainer);
    container.appendChild(legend);
    container.appendChild(instructions);

    return container;
  }

  /**
   * Create map nodes for zones
   */
  private createMapNodes(mapContainer: HTMLElement): void {
    if (!this.currentGameState) return;

    // Base Camp (always center)
    const baseCampNode = this.createZoneNode({
      id: "base-camp",
      name: "Cloud City Base Camp",
      description: "Your home base in the clouds",
      status: "active",
      isArchived: false,
      unlockedAt: "",
    }, { x: 50, y: 50 }, true);
    mapContainer.appendChild(baseCampNode);

    // Position zones around the base camp
    const positions: MapPosition[] = [
      { x: 25, y: 25 },   // Top-left
      { x: 75, y: 25 },   // Top-right
      { x: 85, y: 50 },   // Right
      { x: 75, y: 75 },   // Bottom-right
      { x: 25, y: 75 },   // Bottom-left
      { x: 15, y: 50 },   // Left
    ];

    // Create nodes for each zone
    this.currentGameState.zones.slice(0, 6).forEach((zone, index) => {
      const position = positions[index] || { x: 50 + (index * 10), y: 30 + (index * 15) };
      const zoneNode = this.createZoneNode(zone, position);
      mapContainer.appendChild(zoneNode);

      // Draw connection line to base camp
      if (zone.status === "active" || zone.status === "completed") {
        const connectionLine = this.createConnectionLine(position, { x: 50, y: 50 });
        mapContainer.appendChild(connectionLine);
      }
    });
  }

  /**
   * Create individual zone node
   */
  private createZoneNode(zone: Zone, position: MapPosition, isBaseCamp = false): HTMLElement {
    const node = document.createElement("div");
    node.className = "zone-node";

    const isCurrentZone = this.currentGameState?.currentZoneId === zone.id;
    const isUnlocked = zone.status === "active" || zone.status === "completed" || isBaseCamp;
    const isArchived = zone.isArchived;

    node.style.cssText = `
      position: absolute;
      left: ${position.x}%;
      top: ${position.y}%;
      transform: translate(-50%, -50%);
      width: ${isBaseCamp ? "120px" : "100px"};
      height: ${isBaseCamp ? "120px" : "100px"};
      border-radius: 50%;
      cursor: ${isUnlocked ? "pointer" : "default"};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      transition: all 0.3s ease;
      z-index: 10;
      ${this.getZoneNodeStyles(isBaseCamp, isCurrentZone, isUnlocked, isArchived)}
    `;

    // Zone icon/symbol
    const icon = document.createElement("div");
    icon.textContent = this.getZoneIcon(zone, isBaseCamp);
    icon.style.cssText = `
      font-size: ${isBaseCamp ? "2rem" : "1.5rem"};
      margin-bottom: 0.25rem;
    `;

    // Zone name
    const name = document.createElement("div");
    name.textContent = zone.name;
    name.style.cssText = `
      font-size: ${isBaseCamp ? "0.7rem" : "0.6rem"};
      font-weight: 600;
      line-height: 1.1;
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
      color: inherit;
    `;

    // Current zone indicator
    if (isCurrentZone) {
      const indicator = document.createElement("div");
      indicator.className = "current-zone-indicator";
      indicator.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        background: #10b981;
        border: 2px solid #059669;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        z-index: 11;
      `;
      indicator.textContent = "●";
      node.appendChild(indicator);
    }

    // Hover and click effects for unlocked zones
    if (isUnlocked) {
      node.addEventListener("mouseenter", () => {
        node.style.transform = "translate(-50%, -50%) scale(1.1)";
        node.style.zIndex = "20";
      });

      node.addEventListener("mouseleave", () => {
        node.style.transform = "translate(-50%, -50%) scale(1)";
        node.style.zIndex = "10";
      });

      node.addEventListener("click", () => {
        if (!isBaseCamp || zone.id !== this.currentGameState?.currentZoneId) {
          this.travelToZone(zone.id);
        }
      });
    }

    // Tooltip on hover
    node.title = `${zone.name}\n${zone.description}${isCurrentZone ? "\n(Current Zone)" : ""}`;

    node.appendChild(icon);
    node.appendChild(name);

    return node;
  }

  /**
   * Get styles for zone node based on state
   */
  private getZoneNodeStyles(isBaseCamp: boolean, isCurrentZone: boolean, isUnlocked: boolean, isArchived: boolean): string {
    if (isBaseCamp) {
      return `
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border: 3px solid #d97706;
        color: #1f2937;
        box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
      `;
    }

    if (isArchived) {
      return `
        background: #374151;
        border: 2px solid #4b5563;
        color: #6b7280;
        opacity: 0.6;
      `;
    }

    if (!isUnlocked) {
      return `
        background: #1f2937;
        border: 2px solid #374151;
        color: #6b7280;
        opacity: 0.7;
      `;
    }

    if (isCurrentZone) {
      return `
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 3px solid #047857;
        color: white;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
      `;
    }

    return `
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border: 2px solid #1e40af;
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    `;
  }

  /**
   * Get icon for zone
   */
  private getZoneIcon(zone: Zone, isBaseCamp: boolean): string {
    if (isBaseCamp) return "🏠";

    // Simple icon mapping based on zone name/type
    const name = zone.name.toLowerCase();
    if (name.includes("data") || name.includes("database")) return "💾";
    if (name.includes("api") || name.includes("service")) return "🔌";
    if (name.includes("frontend") || name.includes("ui")) return "🎨";
    if (name.includes("test") || name.includes("debug")) return "🔍";
    if (name.includes("deploy") || name.includes("ops")) return "🚀";
    if (name.includes("secure") || name.includes("auth")) return "🔒";

    return "⚡"; // Default zone icon
  }

  /**
   * Create connection line between zones
   */
  private createConnectionLine(from: MapPosition, to: MapPosition): HTMLElement {
    const line = document.createElement("div");
    line.className = "zone-connection";

    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    line.style.cssText = `
      position: absolute;
      left: ${from.x}%;
      top: ${from.y}%;
      width: ${distance * 0.01 * 700}px;
      height: 2px;
      background: linear-gradient(90deg, rgba(71, 85, 105, 0.6) 0%, rgba(71, 85, 105, 0.3) 100%);
      transform-origin: 0 0;
      transform: rotate(${angle}deg);
      z-index: 1;
    `;

    return line;
  }

  /**
   * Create map legend
   */
  private createLegend(): HTMLElement {
    const legend = document.createElement("div");
    legend.className = "map-legend";
    legend.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin: 1rem 0;
      font-size: 0.8rem;
    `;

    const legendItems = [
      { color: "#fbbf24", text: "Base Camp", icon: "🏠" },
      { color: "#10b981", text: "Current Zone", icon: "●" },
      { color: "#3b82f6", text: "Unlocked", icon: "⚡" },
      { color: "#6b7280", text: "Locked/Archived", icon: "🔒" },
    ];

    legendItems.forEach(item => {
      const legendItem = document.createElement("div");
      legendItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #cbd5e1;
      `;

      const indicator = document.createElement("span");
      indicator.style.cssText = `
        display: inline-block;
        width: 12px;
        height: 12px;
        background: ${item.color};
        border-radius: 50%;
      `;

      const text = document.createElement("span");
      text.textContent = `${item.icon} ${item.text}`;

      legendItem.appendChild(indicator);
      legendItem.appendChild(text);
      legend.appendChild(legendItem);
    });

    return legend;
  }

  /**
   * Travel to a zone (update currentZoneId)
   */
  private travelToZone(zoneId: string): void {
    if (!this.wsClient.isConnected()) {
      console.warn("Cannot travel: WebSocket not connected");
      return;
    }

    // For MVP, we'll send a zone_choice message to update the current zone
    const success = this.wsClient.send({
      type: "zone_choice",
      zoneId,
      reason: `Traveled to zone via world map`,
    });

    if (success) {
      console.log(`Traveled to zone: ${zoneId}`);
      closeModal();
    } else {
      console.error("Failed to send travel message");
    }
  }

  /**
   * Get the current game state
   */
  getGameState(): GameState | undefined {
    return this.currentGameState;
  }
}

/**
 * Global instance management
 */
let globalWorldMapModal: WorldMapModal | null = null;

/**
 * Initialize world map modal
 */
export function initializeWorldMapModal(gameStore: GameStore, wsClient: WSClient): WorldMapModal {
  globalWorldMapModal = new WorldMapModal(gameStore, wsClient);
  return globalWorldMapModal;
}

/**
 * Get the global world map modal instance
 */
export function getWorldMapModal(): WorldMapModal | null {
  return globalWorldMapModal;
}

/**
 * Open the world map modal (convenience function)
 */
export function openWorldMap(): void {
  if (globalWorldMapModal) {
    globalWorldMapModal.open();
  } else {
    console.warn("World map modal not initialized");
  }
}