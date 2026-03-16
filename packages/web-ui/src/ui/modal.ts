/**
 * Reusable Modal System
 * DOM overlay with backdrop, centered content box, close on backdrop click or ESC
 */

export class Modal {
  private static instance: Modal | null = null;
  private modalElement: HTMLElement | null = null;
  private backdropElement: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;

  constructor() {
    this.bindEscapeHandler();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Modal {
    if (!Modal.instance) {
      Modal.instance = new Modal();
    }
    return Modal.instance;
  }

  /**
   * Open modal with provided content
   */
  openModal(content: HTMLElement): void {
    if (this.modalElement) {
      this.closeModal();
    }

    this.createModalElements();
    if (this.contentElement) {
      this.contentElement.appendChild(content);
    }
    this.showModal();
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    if (this.modalElement) {
      this.modalElement.style.opacity = "0";
      setTimeout(() => {
        if (this.modalElement && this.modalElement.parentNode) {
          this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.modalElement = null;
        this.backdropElement = null;
        this.contentElement = null;
      }, 200);
    }
  }

  /**
   * Create modal DOM elements
   */
  private createModalElements(): void {
    // Create modal container
    this.modalElement = document.createElement("div");
    this.modalElement.className = "modal-container";
    this.modalElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    // Create backdrop
    this.backdropElement = document.createElement("div");
    this.backdropElement.className = "modal-backdrop";
    this.backdropElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      cursor: pointer;
    `;

    // Create content box
    this.contentElement = document.createElement("div");
    this.contentElement.className = "modal-content";
    this.contentElement.style.cssText = `
      position: relative;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      z-index: 1001;
    `;

    // Add close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.className = "modal-close-button";
    closeButton.style.cssText = `
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      z-index: 1002;
    `;
    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.backgroundColor = "rgba(148, 163, 184, 0.2)";
      closeButton.style.color = "#e2e8f0";
    });
    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.backgroundColor = "transparent";
      closeButton.style.color = "#94a3b8";
    });
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeModal();
    });

    // Handle backdrop click to close
    this.backdropElement.addEventListener("click", () => {
      this.closeModal();
    });

    // Prevent content clicks from closing modal
    this.contentElement.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Assemble modal
    this.contentElement.appendChild(closeButton);
    this.modalElement.appendChild(this.backdropElement);
    this.modalElement.appendChild(this.contentElement);

    // Add to DOM
    document.body.appendChild(this.modalElement);
  }

  /**
   * Show the modal with fade-in animation
   */
  private showModal(): void {
    if (this.modalElement) {
      // Force reflow to ensure opacity transition works
      this.modalElement.offsetHeight;
      this.modalElement.style.opacity = "1";
    }
  }

  /**
   * Bind ESC key handler
   */
  private bindEscapeHandler(): void {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modalElement) {
        this.closeModal();
      }
    });
  }
}

/**
 * Convenience functions for global use
 */
export function openModal(content: HTMLElement): void {
  Modal.getInstance().openModal(content);
}

export function closeModal(): void {
  Modal.getInstance().closeModal();
}