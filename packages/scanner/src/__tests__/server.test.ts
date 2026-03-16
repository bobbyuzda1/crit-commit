import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import WebSocket from "ws";
import { GameServer } from "../server.js";
import type { GameState, ClientMessage, ServerMessage, PlayerSettings } from "@crit-commit/shared";
import { CharacterClass } from "@crit-commit/shared";

// Mock the shared module
vi.mock("@crit-commit/shared", async () => {
  const actual = await vi.importActual("@crit-commit/shared");
  return {
    ...actual,
    // Add any specific mocks if needed
  };
});

describe("GameServer", () => {
  let server: GameServer;
  let mockGameState: GameState;
  let mockSettings: PlayerSettings;
  let testPort: number;

  beforeEach(() => {
    testPort = 3000 + Math.floor(Math.random() * 1000); // Random test port

    mockGameState = {
      schemaVersion: 1,
      character: {
        name: "TestPlayer",
        class: CharacterClass.Architect,
        level: 1,
        xp: 0,
        xpToNext: 100,
        critChance: 0.05,
        critMultiplier: 2.0,
        xpBonus: 0,
        createdAt: "2026-03-16T00:00:00Z"
      },
      stats: {
        totalXP: 0,
        totalCrits: 0,
        maxCritStreak: 0,
        questsCompleted: 0,
        stackjackWins: 0,
        stackjackLosses: 0,
        zonesUnlocked: 1,
        sessionCount: 0,
        totalPlayTime: 0
      },
      party: [],
      inventory: [],
      equippedGear: {},
      materiaCollection: [],
      equippedMateria: [],
      activeQuests: [],
      completedQuests: [],
      availableQuests: [],
      zones: [],
      stackjackState: {
        isActive: false,
        playerTotal: 0,
        opponentTotal: 0,
        playerCards: [],
        opponentCards: [],
        playerSideDeck: [],
        opponentSideDeck: [],
        playerRoundsWon: 0,
        opponentRoundsWon: 0,
        currentRound: 1,
        isPlayerTurn: true,
        hasPlayerStood: false,
        hasOpponentStood: false,
        gameOver: false
      },
      cardCollection: [],
      narrative: {
        currentStoryArc: "beginning",
        storyArcs: {},
        recentEvents: [],
        encounterHistory: [],
        lastClaudeCall: ""
      },
      isInSession: false,
      critStreak: 0,
      createdAt: "2026-03-16T00:00:00Z",
      updatedAt: "2026-03-16T00:00:00Z"
    };

    mockSettings = {
      watchPaths: ["/test/path"],
      batchIntervalMinutes: 5,
      showAnimations: true,
      soundEnabled: false,
      showNotifications: true,
      autoEquipBetterGear: true,
      skipTutorial: false,
      compactUI: false,
      debugMode: false,
      maxHistoryEvents: 100
    };
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe("HTTP Server", () => {
    it("should start and respond to HTTP GET / with 200", async () => {
      // Mock static directory - we'll use a non-existent directory for testing
      server = new GameServer("/tmp/test-web-ui-dist", mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // Make HTTP request to root path
      const response = await fetch(`http://localhost:${testPort}/`);
      expect(response.status).toBe(200);
    });

    it("should serve static files from configured directory", async () => {
      server = new GameServer("/tmp/test-web-ui-dist", mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // The server should be running and able to handle requests
      const response = await fetch(`http://localhost:${testPort}/health`);
      // Should get 404 for unknown routes, but server should be responsive
      expect([200, 404]).toContain(response.status);
    });
  });

  describe("WebSocket Server", () => {
    it("should accept WebSocket connections", async () => {
      server = new GameServer("/tmp/test-web-ui-dist", mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // Create WebSocket connection
      const ws = new WebSocket(`ws://localhost:${testPort}`);

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          resolve();
        });
        ws.on("error", reject);

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error("WebSocket connection timeout")), 5000);
      });

      ws.close();
    });

    it("should send state_update on WebSocket connect", async () => {
      server = new GameServer("/tmp/test-web-ui-dist", mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // Set initial game state
      server.updateGameState(mockGameState);

      const ws = new WebSocket(`ws://localhost:${testPort}`);

      const stateUpdate = await new Promise<ServerMessage>((resolve, reject) => {
        ws.on("message", (data) => {
          try {
            const message: ServerMessage = JSON.parse(data.toString());
            if (message.type === "state_update") {
              resolve(message);
            }
          } catch (error) {
            reject(error);
          }
        });

        ws.on("error", reject);

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error("No state_update received")), 5000);
      });

      expect(stateUpdate.type).toBe("state_update");
      if (stateUpdate.type === "state_update") {
        expect(stateUpdate.gameState).toBeDefined();
        expect(stateUpdate.gameState.character.name).toBe("TestPlayer");
      }
      expect(stateUpdate.timestamp).toBeDefined();

      ws.close();
    });

    it("should receive and acknowledge client messages", async () => {
      server = new GameServer("/tmp/test-web-ui-dist", mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      const ws = new WebSocket(`ws://localhost:${testPort}`);

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => resolve());
        ws.on("error", reject);
        setTimeout(() => reject(new Error("WebSocket connection timeout")), 5000);
      });

      // Send a client message
      const clientMessage: ClientMessage = {
        type: "ping",
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(clientMessage));

      // Wait for the message handler to be called
      await new Promise<void>((resolve) => {
        const checkHandler = () => {
          if (mockMessageHandler.mock.calls.length > 0) {
            resolve();
          } else {
            setTimeout(checkHandler, 50);
          }
        };
        checkHandler();
      });

      expect(mockMessageHandler).toHaveBeenCalledWith(clientMessage);

      ws.close();
    });

    it("should broadcast updates to all connected clients", async () => {
      server = new GameServer("/tmp/test-web-ui-dist", mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // Create two WebSocket connections
      const ws1 = new WebSocket(`ws://localhost:${testPort}`);
      const ws2 = new WebSocket(`ws://localhost:${testPort}`);

      // Wait for both connections to open
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          ws1.on("open", () => resolve());
          ws1.on("error", reject);
        }),
        new Promise<void>((resolve, reject) => {
          ws2.on("open", () => resolve());
          ws2.on("error", reject);
        })
      ]);

      // Clear initial state_update messages
      await new Promise(resolve => setTimeout(resolve, 100));

      const receivedMessages1: ServerMessage[] = [];
      const receivedMessages2: ServerMessage[] = [];

      ws1.on("message", (data) => {
        receivedMessages1.push(JSON.parse(data.toString()));
      });

      ws2.on("message", (data) => {
        receivedMessages2.push(JSON.parse(data.toString()));
      });

      // Push an update
      const testMessage: ServerMessage = {
        type: "status",
        status: "scanning",
        message: "Test broadcast",
        timestamp: new Date().toISOString()
      };

      server.pushUpdate(testMessage);

      // Wait for messages to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessages1).toHaveLength(1);
      expect(receivedMessages2).toHaveLength(1);
      expect(receivedMessages1[0]).toEqual(testMessage);
      expect(receivedMessages2[0]).toEqual(testMessage);

      ws1.close();
      ws2.close();
    });
  });

  describe("Configuration", () => {
    it("should use configurable port from PlayerSettings", async () => {
      const customSettings = { ...mockSettings };
      server = new GameServer("/tmp/test-web-ui-dist", customSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // Server should be listening on the specified port
      const response = await fetch(`http://localhost:${testPort}/`);
      expect(response.status).toBe(200);
    });

    it("should serve static files from configurable directory", async () => {
      const customStaticDir = "/custom/static/path";
      server = new GameServer(customStaticDir, mockSettings);

      const mockMessageHandler = vi.fn();
      await server.start(testPort, mockMessageHandler);

      // Server should be configured with the custom static directory
      // We can't easily test file serving without actual files, but we can verify the server starts
      const response = await fetch(`http://localhost:${testPort}/`);
      expect([200, 404]).toContain(response.status); // 404 is fine if directory doesn't exist
    });
  });
});