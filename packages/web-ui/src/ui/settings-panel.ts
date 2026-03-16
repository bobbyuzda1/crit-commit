/**
 * Settings Panel
 * Modal content for game settings with batch interval slider
 */

import { openModal } from "./modal.js";

export interface SettingsConfig {
  batchIntervalMinutes: number;
}

export class SettingsPanel {
  private wsClient: any;
  private currentSettings: SettingsConfig = {
    batchIntervalMinutes: 5
  };

  constructor(wsClient: any) {
    this.wsClient = wsClient;
  }

  /**
   * Open settings modal
   */
  openSettings(): void {
    const content = this.createSettingsContent();
    openModal(content);
  }

  /**
   * Update current settings
   */
  updateSettings(settings: Partial<SettingsConfig>): void {
    this.currentSettings = { ...this.currentSettings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): SettingsConfig {
    return { ...this.currentSettings };
  }

  /**
   * Create settings modal content
   */
  private createSettingsContent(): HTMLElement {
    const container = document.createElement("div");
    container.className = "settings-content";
    container.style.cssText = `
      padding: 2rem;
      min-width: 400px;
      color: #e2e8f0;
    `;

    // Title
    const title = document.createElement("h2");
    title.textContent = "Settings";
    title.style.cssText = `
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #f1f5f9;
      padding-right: 2rem;
    `;

    // Batch interval section
    const batchSection = document.createElement("div");
    batchSection.className = "settings-section";
    batchSection.style.cssText = `
      margin-bottom: 2rem;
    `;

    const batchLabel = document.createElement("label");
    batchLabel.className = "settings-label";
    batchLabel.style.cssText = `
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #cbd5e1;
    `;
    batchLabel.textContent = "Batch Interval";

    const batchDescription = document.createElement("p");
    batchDescription.className = "settings-description";
    batchDescription.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.4;
    `;
    batchDescription.textContent = "How often to process and send coding events to the game engine.";

    // Slider container
    const sliderContainer = document.createElement("div");
    sliderContainer.className = "slider-container";
    sliderContainer.style.cssText = `
      position: relative;
      margin-bottom: 1rem;
    `;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "1";
    slider.max = "30";
    slider.value = this.currentSettings.batchIntervalMinutes.toString();
    slider.className = "batch-interval-slider";
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #475569;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    `;

    // Slider thumb styling (webkit)
    const style = document.createElement("style");
    style.textContent = `
      .batch-interval-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      .batch-interval-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);

    // Value display
    const valueDisplay = document.createElement("div");
    valueDisplay.className = "slider-value";
    valueDisplay.style.cssText = `
      text-align: center;
      margin-top: 0.5rem;
      font-weight: 500;
      color: #3b82f6;
    `;
    valueDisplay.textContent = `${this.currentSettings.batchIntervalMinutes} minutes`;

    // Update value display on slider change
    slider.addEventListener("input", (e) => {
      const value = (e.target as HTMLInputElement).value;
      valueDisplay.textContent = `${value} minutes`;
    });

    // Slider tick marks
    const tickMarks = document.createElement("div");
    tickMarks.className = "slider-ticks";
    tickMarks.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #64748b;
    `;

    const tickValues = [1, 5, 10, 15, 20, 25, 30];
    tickValues.forEach(value => {
      const tick = document.createElement("span");
      tick.textContent = value.toString();
      tickMarks.appendChild(tick);
    });

    // Save button
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save Settings";
    saveButton.className = "save-settings-button";
    saveButton.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
      margin-top: 1.5rem;
      width: 100%;
    `;

    saveButton.addEventListener("mouseenter", () => {
      saveButton.style.backgroundColor = "#2563eb";
    });
    saveButton.addEventListener("mouseleave", () => {
      saveButton.style.backgroundColor = "#3b82f6";
    });

    saveButton.addEventListener("click", () => {
      const newInterval = parseInt(slider.value);
      this.currentSettings.batchIntervalMinutes = newInterval;

      // Send update to server via WebSocket
      if (this.wsClient && this.wsClient.send) {
        this.wsClient.send({
          type: "update_settings",
          settings: {
            batchIntervalMinutes: newInterval
          }
        });
      }

      console.log(`Settings updated: Batch interval = ${newInterval} minutes`);

      // Close modal (we'll need to import closeModal)
      const { closeModal } = require("./modal.js");
      closeModal();
    });

    // Assemble the content
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);

    batchSection.appendChild(batchLabel);
    batchSection.appendChild(batchDescription);
    batchSection.appendChild(sliderContainer);
    batchSection.appendChild(tickMarks);

    container.appendChild(title);
    container.appendChild(batchSection);
    container.appendChild(saveButton);

    return container;
  }
}