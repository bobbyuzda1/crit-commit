/**
 * Coffee Shop Modal
 * Promotional modal for Cloud City Roasters with discount code
 * Used by both footer coffee icon and in-game coffee shop sprite
 */

import { openModal } from "./modal.js";

export class CoffeeShopModal {
  /**
   * Open coffee shop modal
   */
  static open(): void {
    const content = CoffeeShopModal.createContent();
    openModal(content);
  }

  /**
   * Create coffee shop modal content
   */
  private static createContent(): HTMLElement {
    const container = document.createElement("div");
    container.className = "coffee-shop-modal-content";
    container.style.cssText = `
      padding: 2rem;
      min-width: 450px;
      text-align: center;
      color: #e2e8f0;
    `;

    // Coffee icon
    const coffeeIcon = document.createElement("div");
    coffeeIcon.innerHTML = "☕";
    coffeeIcon.style.cssText = `
      font-size: 4rem;
      margin-bottom: 1rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    `;

    // Title
    const title = document.createElement("h2");
    title.textContent = "Cloud City Roasters";
    title.style.cssText = `
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    `;

    // Tagline
    const tagline = document.createElement("p");
    tagline.textContent = "Fuel your quest with real coffee!";
    tagline.style.cssText = `
      margin: 0 0 2rem 0;
      font-size: 1.125rem;
      color: #cbd5e1;
      font-weight: 500;
    `;

    // Discount code section
    const discountSection = document.createElement("div");
    discountSection.className = "discount-section";
    discountSection.style.cssText = `
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    `;

    const discountLabel = document.createElement("p");
    discountLabel.textContent = "Special Agent Discount Code:";
    discountLabel.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    `;

    // Code display with copy button
    const codeContainer = document.createElement("div");
    codeContainer.className = "code-container";
    codeContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid #334155;
    `;

    const codeText = document.createElement("span");
    codeText.textContent = "AgentQ10";
    codeText.className = "discount-code";
    codeText.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 1.5rem;
      font-weight: bold;
      color: #3b82f6;
      letter-spacing: 2px;
    `;

    const copyButton = document.createElement("button");
    copyButton.innerHTML = "📋";
    copyButton.title = "Copy to clipboard";
    copyButton.className = "copy-code-button";
    copyButton.style.cssText = `
      background: none;
      border: 1px solid #475569;
      color: #cbd5e1;
      border-radius: 4px;
      padding: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s ease;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    copyButton.addEventListener("mouseenter", () => {
      copyButton.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
      copyButton.style.borderColor = "#3b82f6";
    });

    copyButton.addEventListener("mouseleave", () => {
      copyButton.style.backgroundColor = "transparent";
      copyButton.style.borderColor = "#475569";
    });

    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("AgentQ10");
        copyButton.innerHTML = "✅";
        copyButton.title = "Copied!";
        setTimeout(() => {
          copyButton.innerHTML = "📋";
          copyButton.title = "Copy to clipboard";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy code:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = "AgentQ10";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        copyButton.innerHTML = "✅";
        setTimeout(() => {
          copyButton.innerHTML = "📋";
        }, 2000);
      }
    });

    codeContainer.appendChild(codeText);
    codeContainer.appendChild(copyButton);

    discountSection.appendChild(discountLabel);
    discountSection.appendChild(codeContainer);

    // Visit website button
    const visitButton = document.createElement("button");
    visitButton.textContent = "Visit Cloud City Roasters";
    visitButton.className = "visit-website-button";
    visitButton.style.cssText = `
      background: linear-gradient(135deg, #8b5a3c 0%, #a0683f 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 1rem 2rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 1.1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    visitButton.addEventListener("mouseenter", () => {
      visitButton.style.background = "linear-gradient(135deg, #9d6843 0%, #b8724a 100%)";
      visitButton.style.transform = "translateY(-2px)";
      visitButton.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.4)";
    });

    visitButton.addEventListener("mouseleave", () => {
      visitButton.style.background = "linear-gradient(135deg, #8b5a3c 0%, #a0683f 100%)";
      visitButton.style.transform = "translateY(0)";
      visitButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
    });

    visitButton.addEventListener("click", () => {
      window.open("https://cloudcityroasters.com", "_blank");
    });

    // Footer note
    const footerNote = document.createElement("p");
    footerNote.textContent = "Premium coffee for premium code ☁️";
    footerNote.style.cssText = `
      margin: 1.5rem 0 0 0;
      font-size: 0.875rem;
      color: #64748b;
      font-style: italic;
    `;

    // Assemble content
    container.appendChild(coffeeIcon);
    container.appendChild(title);
    container.appendChild(tagline);
    container.appendChild(discountSection);
    container.appendChild(visitButton);
    container.appendChild(footerNote);

    return container;
  }
}