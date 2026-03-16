import "./style.css";
import { Application, Assets, Text } from "pixi.js";
import { createWSClient } from "./ws-client.js";
import { createGameStore } from "./store.js";
import { Dashboard } from "./ui/dashboard.js";
import { QuestLog } from "./ui/quest-log.js";
import { EventFeed } from "./ui/event-feed.js";
import { StatsPanel } from "./ui/stats-panel.js";
import { SceneManager } from "./scenes/scene-manager.js";
import { createBaseCampScene } from "./scenes/base-camp.js";
import { createCharacterSprite, createPartyMemberSprite } from "./sprites/character.js";
import { CritEffectManager } from "./effects/crit-effect.js";

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

    // Handle crit effects (will be initialized after PixiJS app is ready)
    if (message.type === "crit_trigger" && (window as any).critCommit?.critEffectManager) {
      (window as any).critCommit.critEffectManager.triggerCritEffect(message);
    }
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

  // Set up scene manager and load base camp
  const sceneManager = new SceneManager(app);
  const baseCampScene = createBaseCampScene(app, () => {
    console.log("Coffee shop clicked — modal will be wired in Task 30");
  });
  sceneManager.setScene(baseCampScene);
  console.log("🏕️ Base camp scene loaded");

  // Initialize crit effect manager
  const critEffectManager = new CritEffectManager(app);
  console.log("✨ Crit effect manager initialized");

  // Add player character sprite
  const state = gameStore.getState();
  const playerSprite = createCharacterSprite(app, {
    name: state.character.name,
    characterClass: state.character.class,
  });
  playerSprite.x = app.screen.width * 0.45;
  playerSprite.y = app.screen.height * 0.72;
  baseCampScene.addChild(playerSprite);

  // Add active party members as smaller companion sprites
  const partyMembers = state.party.members.filter(m => m.isActive);
  partyMembers.forEach((member, i) => {
    const companion = createPartyMemberSprite(app, {
      name: member.name,
      characterClass: member.class,
    });
    companion.x = app.screen.width * 0.45 + 50 + i * 40;
    companion.y = app.screen.height * 0.74;
    baseCampScene.addChild(companion);
  });

  // Store references globally for debugging
  (window as any).critCommit = {
    gameStore,
    wsClient,
    pixiApp: app,
    sceneManager,
    critEffectManager,
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