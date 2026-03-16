import type { ServerMessage, ClientMessage } from "@crit-commit/shared";

export interface WSClientConfig {
  url: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  backoffMultiplier?: number;
}

export interface WSClientStatus {
  status: "connecting" | "connected" | "disconnected" | "failed";
  lastError?: string;
  reconnectAttempt?: number;
}

export type MessageHandler = (message: ServerMessage) => void;
export type StatusHandler = (status: WSClientStatus) => void;

/**
 * WebSocket client with exponential backoff reconnection for Crit Commit RPG.
 * Handles connection management, message dispatching, and status reporting.
 */
export class WSClient {
  private ws?: WebSocket;
  private config: Required<WSClientConfig>;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private currentStatus: WSClientStatus = { status: "disconnected" };
  private reconnectTimeout?: number;
  private reconnectAttempts = 0;
  private shouldReconnect = false;

  constructor(config: WSClientConfig) {
    this.config = {
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000, // 1 second
      maxReconnectDelay: 30000, // 30 seconds
      backoffMultiplier: 1.5,
      ...config,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.shouldReconnect = true;
    this.updateStatus({ status: "connecting", reconnectAttempt: this.reconnectAttempts });

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(`Failed to create WebSocket connection: ${error}`);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = undefined;
    }

    this.updateStatus({ status: "disconnected" });
  }

  /**
   * Send a message to the server
   */
  send(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send message: WebSocket not connected", message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      return false;
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register a status change handler
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    // Immediately call handler with current status
    handler(this.currentStatus);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Get current connection status
   */
  getStatus(): WSClientStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.currentStatus.status === "connected";
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.updateStatus({ status: "connected" });
      console.log("WebSocket connected to", this.config.url);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.dispatchMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error, event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code} ${event.reason}`);
      this.updateStatus({ status: "disconnected" });

      if (this.shouldReconnect && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      this.handleError("WebSocket connection error");
    };
  }

  private dispatchMessage(message: ServerMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error("Message handler error:", error);
      }
    });
  }

  private updateStatus(newStatus: WSClientStatus): void {
    this.currentStatus = { ...this.currentStatus, ...newStatus };
    this.statusHandlers.forEach(handler => {
      try {
        handler(this.currentStatus);
      } catch (error) {
        console.error("Status handler error:", error);
      }
    });
  }

  private handleError(errorMessage: string): void {
    this.updateStatus({
      status: "failed",
      lastError: errorMessage,
      reconnectAttempt: this.reconnectAttempts
    });

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`);
      this.updateStatus({
        status: "failed",
        lastError: "Max reconnection attempts reached"
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      if (this.shouldReconnect) {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect();
      }
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.statusHandlers.clear();
  }
}

/**
 * Create a WebSocket client configured for the local Crit Commit server
 */
export function createWSClient(port = 3000): WSClient {
  return new WSClient({
    url: `ws://localhost:${port}`,
  });
}