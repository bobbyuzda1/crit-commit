import "./style.css";
import { Application, Assets, Text } from "pixi.js";

async function init() {
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

  // Handle resize
  window.addEventListener("resize", () => {
    text.x = app.screen.width / 2;
    text.y = app.screen.height / 2;
  });

  console.log("Crit Commit Web UI initialized with PixiJS");
}

init().catch((error) => {
  console.error("Failed to initialize Crit Commit:", error);
});