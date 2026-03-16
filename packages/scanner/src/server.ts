import express from "express";
import { WebSocketServer } from "ws";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import type {
  GameState,
  ClientMessage,
  ServerMessage,
  PlayerSettings
} from "@crit-commit/shared";

/**
 * HTTP and WebSocket server for Crit Commit RPG web UI communication.
 * Serves static files and provides real-time game state updates.
 */
export class GameServer {
  private app: express.Application;
  private httpServer?: http.Server;
  private wsServer?: WebSocketServer;
  private gameState?: GameState;
  private staticDir: string;
  private settings: PlayerSettings;

  constructor(staticDir: string, settings: PlayerSettings) {
    this.staticDir = staticDir;
    this.settings = settings;
    this.app = express();
    this.setupRoutes();
  }

  /**
   * Set up Express routes and middleware
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // API endpoints (for future expansion)
    this.app.get("/api/status", (req, res) => {
      res.json({
        gameEngineStatus: "online",
        activeConnections: this.wsServer?.clients.size || 0,
        lastBatchProcessed: this.gameState?.lastBatchTime,
        uptime: process.uptime(),
        version: "0.1.0"
      });
    });

    // Static file serving - serve files from the static directory
    this.app.use(express.static(this.staticDir));

    // Default route - serve index.html or a basic response
    this.app.get("/", async (req, res) => {
      try {
        const indexPath = path.join(this.staticDir, "index.html");
        await fs.access(indexPath);
        res.sendFile(indexPath);
      } catch {
        // If index.html doesn't exist, send a basic response
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head><title>Crit Commit RPG</title></head>
            <body>
              <h1>Crit Commit RPG</h1>
              <p>Web UI not yet built. Server is running on port ${req.socket.localPort}</p>
            </body>
          </html>
        `);
      }
    });
  }

  /**
   * Start the HTTP server and WebSocket server
   */
  async start(port: number, messageHandler: (message: ClientMessage) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create HTTP server
      this.httpServer = http.createServer(this.app);

      // Create WebSocket server on the same HTTP server
      this.wsServer = new WebSocketServer({
        server: this.httpServer,
        path: "/" // Accept WebSocket connections on root path
      });

      // Set up WebSocket event handlers
      this.wsServer.on("connection", (ws, request) => {
        console.log(`WebSocket client connected from ${request.socket.remoteAddress}`);

        // Send current game state immediately on connection
        if (this.gameState) {
          const stateUpdate: ServerMessage = {
            type: "state_update",
            gameState: this.gameState,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(stateUpdate));
        }

        // Handle incoming messages from clients
        ws.on("message", (data) => {
          try {
            const message: ClientMessage = JSON.parse(data.toString());

            // Log the message in debug mode
            if (this.settings.debugMode) {
              console.log("Received WebSocket message:", message);
            }

            // Route message to the provided handler
            messageHandler(message);

          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);

            // Send error response to client
            const errorMessage: ServerMessage = {
              type: "error",
              error: "Invalid message format",
              context: "Failed to parse JSON",
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(errorMessage));
          }
        });

        // Handle client disconnection
        ws.on("close", (code, reason) => {
          console.log(`WebSocket client disconnected: ${code} ${reason.toString()}`);
        });

        // Handle WebSocket errors
        ws.on("error", (error) => {
          console.error("WebSocket client error:", error);
        });
      });

      // Handle WebSocket server errors
      this.wsServer.on("error", (error) => {
        console.error("WebSocket server error:", error);
      });

      // Start the HTTP server
      this.httpServer.listen(port, () => {
        console.log(`Crit Commit server running on http://localhost:${port}`);
        console.log(`WebSocket server ready for connections`);
        console.log(`Serving static files from: ${this.staticDir}`);
        resolve();
      });

      // Handle server startup errors
      this.httpServer.on("error", (error) => {
        console.error("Failed to start server:", error);
        reject(error);
      });
    });
  }

  /**
   * Stop the server and close all connections
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wsServer) {
        // Close all WebSocket connections
        this.wsServer.clients.forEach((ws) => {
          ws.terminate();
        });
        this.wsServer.close();
      }

      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log("Server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Update the current game state and broadcast to all connected clients
   */
  updateGameState(gameState: GameState): void {
    this.gameState = gameState;

    const stateUpdate: ServerMessage = {
      type: "state_update",
      gameState,
      timestamp: new Date().toISOString()
    };

    this.pushUpdate(stateUpdate);
  }

  /**
   * Broadcast a server message to all connected WebSocket clients
   */
  pushUpdate(message: ServerMessage): void {
    if (!this.wsServer) {
      console.warn("Cannot push update: WebSocket server not initialized");
      return;
    }

    const messageJson = JSON.stringify(message);
    let successCount = 0;
    let errorCount = 0;

    // Broadcast to all connected clients
    this.wsServer.clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(messageJson);
          successCount++;
        } catch (error) {
          console.error("Failed to send message to WebSocket client:", error);
          errorCount++;
        }
      }
    });

    if (this.settings.debugMode && successCount > 0) {
      console.log(`Broadcasted ${message.type} to ${successCount} clients${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
    }
  }

  /**
   * Get the number of active WebSocket connections
   */
  getConnectionCount(): number {
    return this.wsServer?.clients.size || 0;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.httpServer?.listening || false;
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      isRunning: this.isRunning(),
      connectionCount: this.getConnectionCount(),
      port: this.httpServer?.address() && typeof this.httpServer.address() === "object"
        ? (this.httpServer.address() as { port: number })?.port
        : null,
      staticDir: this.staticDir,
      uptime: process.uptime()
    };
  }
}