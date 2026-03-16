/**
 * Footer Component
 * Bottom bar with donation, coffee, version, settings, and connection status
 */

import { openModal } from "./modal.js";
import { SettingsPanel } from "./settings-panel.js";
import { CoffeeShopModal } from "./coffee-shop-modal.js";
import { openWorldMap } from "./world-map.js";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "failed";

export class Footer {
  private container: HTMLElement;
  private settingsPanel: SettingsPanel;
  private statusDot: HTMLElement;

  constructor(containerSelector: string, wsClient: any) {
    const element = document.querySelector(containerSelector);
    if (!element) {
      throw new Error(`Footer container "${containerSelector}" not found`);
    }

    this.container = element as HTMLElement;
    this.settingsPanel = new SettingsPanel(wsClient);
    this.initializeFooter();
  }

  /**
   * Update connection status
   */
  setConnectionStatus(status: ConnectionStatus): void {
    if (!this.statusDot) return;

    const colors = {
      connected: "#22c55e",    // green
      connecting: "#eab308",   // yellow
      disconnected: "#64748b", // gray
      failed: "#ef4444"        // red
    };

    this.statusDot.style.backgroundColor = colors[status] || colors.disconnected;

    const titles = {
      connected: "Connected to game engine",
      connecting: "Connecting to game engine...",
      disconnected: "Disconnected from game engine",
      failed: "Failed to connect to game engine"
    };

    this.statusDot.title = titles[status] || titles.disconnected;
  }

  /**
   * Initialize footer layout and components
   */
  private initializeFooter(): void {
    // Clear any existing content
    this.container.innerHTML = "";

    // Create footer wrapper
    const footerWrapper = document.createElement("div");
    footerWrapper.className = "footer-wrapper";
    footerWrapper.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid #334155;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
      backdrop-filter: blur(8px);
    `;

    // Left section: Donation and Coffee
    const leftSection = document.createElement("div");
    leftSection.className = "footer-left";
    leftSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 1rem;
    `;

    // Donation button
    const donationButton = this.createIconButton("❤️", "Support the developer", () => {
      this.openDonationModal();
    });

    // Coffee button
    const coffeeButton = this.createIconButton("☕", "Visit Cloud City Roasters", () => {
      CoffeeShopModal.open();
    });

    // Map button
    const mapButton = this.createIconButton("🗺️", "Open world map", () => {
      openWorldMap();
    });

    leftSection.appendChild(donationButton);
    leftSection.appendChild(coffeeButton);
    leftSection.appendChild(mapButton);

    // Center section: Version
    const centerSection = document.createElement("div");
    centerSection.className = "footer-center";
    centerSection.style.cssText = `
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 500;
    `;
    centerSection.textContent = "Crit Commit v0.1.0";

    // Right section: Settings and Status
    const rightSection = document.createElement("div");
    rightSection.className = "footer-right";
    rightSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 1rem;
    `;

    // Settings button
    const settingsButton = this.createIconButton("⚙️", "Open settings", () => {
      this.settingsPanel.openSettings();
    });

    // Connection status dot
    this.statusDot = document.createElement("div");
    this.statusDot.className = "connection-status-dot";
    this.statusDot.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #64748b;
      transition: background-color 0.3s ease;
      cursor: help;
    `;
    this.statusDot.title = "Disconnected from game engine";

    rightSection.appendChild(settingsButton);
    rightSection.appendChild(this.statusDot);

    // Assemble footer
    footerWrapper.appendChild(leftSection);
    footerWrapper.appendChild(centerSection);
    footerWrapper.appendChild(rightSection);
    this.container.appendChild(footerWrapper);
  }

  /**
   * Create a styled icon button
   */
  private createIconButton(icon: string, title: string, onClick: () => void): HTMLElement {
    const button = document.createElement("button");
    button.innerHTML = icon;
    button.title = title;
    button.className = "footer-icon-button";
    button.style.cssText = `
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
    `;

    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "rgba(148, 163, 184, 0.2)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "transparent";
    });

    button.addEventListener("click", onClick);

    return button;
  }

  /**
   * Open donation modal
   */
  private openDonationModal(): void {
    const content = this.createDonationModalContent();
    openModal(content);
  }

  /**
   * Create donation modal content
   */
  private createDonationModalContent(): HTMLElement {
    const container = document.createElement("div");
    container.className = "donation-modal-content";
    container.style.cssText = `
      padding: 2rem;
      min-width: 400px;
      text-align: center;
      color: #e2e8f0;
    `;

    // Heart icon
    const heartIcon = document.createElement("div");
    heartIcon.innerHTML = "❤️";
    heartIcon.style.cssText = `
      font-size: 3rem;
      margin-bottom: 1rem;
    `;

    // Title
    const title = document.createElement("h2");
    title.textContent = "Support Crit Commit";
    title.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #f1f5f9;
    `;

    // Description
    const description = document.createElement("p");
    description.textContent = "Enjoying Crit Commit? Support the developer.";
    description.style.cssText = `
      margin: 0 0 2rem 0;
      color: #cbd5e1;
      line-height: 1.5;
    `;

    // Support button (placeholder)
    const supportButton = document.createElement("button");
    supportButton.textContent = "Support Development";
    supportButton.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 2rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
      font-size: 1rem;
    `;

    supportButton.addEventListener("mouseenter", () => {
      supportButton.style.backgroundColor = "#dc2626";
    });
    supportButton.addEventListener("mouseleave", () => {
      supportButton.style.backgroundColor = "#ef4444";
    });

    supportButton.addEventListener("click", () => {
      // Placeholder - would open donation link
      console.log("Donation link clicked (placeholder)");
    });

    // Note
    const note = document.createElement("p");
    note.textContent = "Thank you for your support! ✨";
    note.style.cssText = `
      margin: 1.5rem 0 0 0;
      font-size: 0.875rem;
      color: #94a3b8;
      font-style: italic;
    `;

    // Assemble content
    container.appendChild(heartIcon);
    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(supportButton);
    container.appendChild(note);

    return container;
  }

  /**
   * Destroy footer and clean up
   */
  destroy(): void {
    this.container.innerHTML = "";
  }
}