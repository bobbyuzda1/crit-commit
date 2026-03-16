import "./style.css";
import { Application, Assets, Text } from "pixi.js";
import { createWSClient } from "./ws-client.js";
import { createGameStore } from "./store.js";
import { Dashboard } from "./ui/dashboard.js";
import { QuestLog } from "./ui/quest-log.js";
import { EventFeed } from "./ui/event-feed.js";
import { StatsPanel } from "./ui/stats-panel.js";

async function init() {
  console.log("🎮 Initializing Crit Commit Web UI...");

  // Initialize game store
  const gameStore = createGameStore();
  console.log("📦 Game store initialized");

  // Initialize Dashboard UI
  const dashboard = new Dashboard("#dashboard");
  console.log("🎛️ Dashboard layout initialized");

  // Initialize Dashboard Components
  const questLog = new QuestLog(dashboard.getQuestLogContainer(), gameStore);
  const eventFeed = new EventFeed(dashboard.getEventFeedContainer(), gameStore);
  const statsPanel = new StatsPanel(dashboard.getStatsPanelContainer(), gameStore);
  console.log("📋 Dashboard components initialized");

  // Initialize WebSocket client
  const wsClient = createWSClient();
  console.log("🔌 WebSocket client created");

  // Connect WebSocket message handling to game store
  wsClient.onMessage((message) => {
    console.log("📨 Received server message:", message.type, message);
    gameStore.handleServerMessage(message);
  });

  // Subscribe to connection status changes
  wsClient.onStatusChange((status) => {
    console.log("🔗 WebSocket status:", status);

    // Update UI based on connection status
    const statusText = status.status === "connected" ? "🟢 Connected" :
                      status.status === "connecting" ? "🟡 Connecting..." :
                      status.status === "failed" ? `🔴 Failed: ${status.lastError}` :
                      "⚪ Disconnected";

    document.title = `Crit Commit - ${statusText}`;

    // Update stats panel connection status
    statsPanel.setConnectionStatus(status.status);
  });

  // Subscribe to key game state changes for logging
  gameStore.subscribeToCharacter((character, previous) => {
    console.log("👤 Character updated:", {
      level: character.level,
      xp: character.xp,
      critChance: character.critChance
    });

    if (previous && character.level > previous.level) {
      console.log(`🎉 Level up! ${previous.level} → ${character.level}`);
    }
  });

  gameStore.subscribeToEvents((events, previous) => {
    const newEvents = events.slice(previous?.length || 0);
    newEvents.forEach(event => {
      console.log(`📜 New event: ${event.description}`, event);
    });
  });

  gameStore.subscribeToParty((party) => {
    const activeCount = party.members.filter(m => m.isActive).length;
    console.log(`👥 Party status: ${activeCount} active members`);
  });

  // Connect to server
  wsClient.connect();

  // Initialize PixiJS Application
  const app = new Application();
  await app.init({
    background: "#0a1628",
    resizeTo: window,
    antialias: false,
  });

  // Append canvas to game-canvas div
  const gameCanvasDiv = document.getElementById("game-canvas");
  if (gameCanvasDiv) {
    gameCanvasDiv.appendChild(app.canvas);
  }

  // Create pixel-style text to verify pipeline works
  const text = new Text({
    text: "Crit Commit",
    style: {
      fontFamily: "monospace",
      fontSize: 32,
      fill: "#e2e8f0",
      align: "center",
    },
  });

  text.anchor.set(0.5);
  text.x = app.screen.width / 2;
  text.y = app.screen.height / 2;

  app.stage.addChild(text);

  // Create connection status text
  const statusText = new Text({
    text: "Connecting to server...",
    style: {
      fontFamily: "monospace",
      fontSize: 16,
      fill: "#64748b",
      align: "center",
    },
  });

  statusText.anchor.set(0.5);
  statusText.x = app.screen.width / 2;
  statusText.y = (app.screen.height / 2) + 60;

  app.stage.addChild(statusText);

  // Update status text based on WebSocket connection
  wsClient.onStatusChange((status) => {
    const statusMessage = status.status === "connected" ? "🟢 Connected to game server" :
                         status.status === "connecting" ? "🟡 Connecting to server..." :
                         status.status === "failed" ? `🔴 Connection failed: ${status.lastError}` :
                         "⚪ Disconnected from server";

    statusText.text = statusMessage;
    statusText.x = app.screen.width / 2; // Re-center after text change
  });

  // Handle resize
  window.addEventListener("resize", () => {
    text.x = app.screen.width / 2;
    text.y = app.screen.height / 2;
    statusText.x = app.screen.width / 2;
    statusText.y = (app.screen.height / 2) + 60;
  });

  // Store references globally for debugging
  (window as any).critCommit = {
    gameStore,
    wsClient,
    pixiApp: app,
    dashboard: {
      dashboard,
      questLog,
      eventFeed,
      statsPanel
    }
  };

  console.log("✅ Crit Commit Web UI initialized successfully");
  console.log("🛠️ Debug tools available at window.critCommit");
}

init().catch((error) => {
  console.error("Failed to initialize Crit Commit:", error);
});