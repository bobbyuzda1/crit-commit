import { Container, Graphics, Text, Application } from "pixi.js";

/** Color palette for the base camp scene. */
const COLORS = {
  skyTop: 0x0a1628,
  skyBottom: 0x1e3a5f,
  ground: 0x2d5016,
  groundDark: 0x1a3a0a,
  cloud: 0xffffff,
  questBoard: 0x8b6914,
  questBoardPost: 0x5c4a1e,
  questIcon: 0xffd700,
  cardTable: 0x6b3a2a,
  cardTableTop: 0x8b5e3c,
  building: 0x7a5c47,
  roof: 0xb84c28,
  steam: 0xcccccc,
  path: 0x9e8c6c,
};

/**
 * Creates the base camp scene — the player's home zone.
 * Programmatic pixel art: sky gradient, clouds, ground, quest board,
 * card table, and coffee shop with steam animation.
 */
export function createBaseCampScene(
  app: Application,
  onCoffeeShopClick?: () => void,
): Container {
  const scene = new Container();
  const w = app.screen.width;
  const h = app.screen.height;

  // ── Sky gradient (two bands) ──
  const sky = new Graphics();
  sky.rect(0, 0, w, h * 0.5);
  sky.fill(COLORS.skyTop);
  sky.rect(0, h * 0.5, w, h * 0.15);
  sky.fill(COLORS.skyBottom);
  scene.addChild(sky);

  // ── Clouds ──
  addCloud(scene, w * 0.15, h * 0.12, 60);
  addCloud(scene, w * 0.55, h * 0.08, 80);
  addCloud(scene, w * 0.8, h * 0.2, 50);

  // ── Ground ──
  const ground = new Graphics();
  ground.rect(0, h * 0.65, w, h * 0.35);
  ground.fill(COLORS.ground);
  // Darker ground strip at bottom
  ground.rect(0, h * 0.85, w, h * 0.15);
  ground.fill(COLORS.groundDark);
  scene.addChild(ground);

  // ── Path ──
  const path = new Graphics();
  path.rect(w * 0.35, h * 0.65, w * 0.3, h * 0.35);
  path.fill(COLORS.path);
  scene.addChild(path);

  // ── Quest Board (left area) ──
  const questBoard = createQuestBoard(w * 0.15, h * 0.55);
  scene.addChild(questBoard);

  // ── Card Table (center-right) ──
  const cardTable = createCardTable(w * 0.65, h * 0.7);
  scene.addChild(cardTable);

  // ── Coffee Shop (right area) ──
  const coffeeShop = createCoffeeShop(w * 0.82, h * 0.48, app, onCoffeeShopClick);
  scene.addChild(coffeeShop);

  // ── Title text ──
  const title = new Text({
    text: "Cloud City Base Camp",
    style: {
      fontFamily: "monospace",
      fontSize: 18,
      fill: "#e2e8f0",
      align: "center",
      dropShadow: {
        color: "#000000",
        distance: 2,
        angle: Math.PI / 4,
        blur: 2,
        alpha: 0.5,
      },
    },
  });
  title.anchor.set(0.5, 0);
  title.x = w / 2;
  title.y = 12;
  scene.addChild(title);

  // Handle resize
  const onResize = () => {
    const nw = app.screen.width;
    const nh = app.screen.height;
    // Rebuild is expensive; for MVP just scale the scene
    scene.scale.set(nw / w, nh / h);
  };
  window.addEventListener("resize", onResize);

  return scene;
}

// ── Helper builders ──

function addCloud(parent: Container, x: number, y: number, size: number): void {
  const cloud = new Graphics();
  cloud.circle(0, 0, size * 0.4);
  cloud.circle(size * 0.3, -size * 0.1, size * 0.35);
  cloud.circle(-size * 0.3, -size * 0.05, size * 0.3);
  cloud.circle(size * 0.15, -size * 0.25, size * 0.25);
  cloud.fill({ color: COLORS.cloud, alpha: 0.15 });
  cloud.x = x;
  cloud.y = y;
  parent.addChild(cloud);
}

function createQuestBoard(x: number, y: number): Container {
  const group = new Container();
  group.x = x;
  group.y = y;

  // Posts
  const leftPost = new Graphics();
  leftPost.rect(-20, -30, 6, 50);
  leftPost.fill(COLORS.questBoardPost);
  group.addChild(leftPost);

  const rightPost = new Graphics();
  rightPost.rect(14, -30, 6, 50);
  rightPost.fill(COLORS.questBoardPost);
  group.addChild(rightPost);

  // Board
  const board = new Graphics();
  board.rect(-24, -40, 48, 30);
  board.fill(COLORS.questBoard);
  board.stroke({ color: 0x5c4a1e, width: 2 });
  group.addChild(board);

  // "!" icon
  const icon = new Text({
    text: "!",
    style: {
      fontFamily: "monospace",
      fontSize: 20,
      fill: "#ffd700",
      fontWeight: "bold",
    },
  });
  icon.anchor.set(0.5);
  icon.x = 0;
  icon.y = -25;
  group.addChild(icon);

  // Label
  const label = new Text({
    text: "Quests",
    style: { fontFamily: "monospace", fontSize: 10, fill: "#cbd5e1" },
  });
  label.anchor.set(0.5, 0);
  label.x = 0;
  label.y = 22;
  group.addChild(label);

  return group;
}

function createCardTable(x: number, y: number): Container {
  const group = new Container();
  group.x = x;
  group.y = y;

  // Table legs
  const legs = new Graphics();
  legs.rect(-18, 8, 4, 16);
  legs.rect(14, 8, 4, 16);
  legs.fill(COLORS.cardTable);
  group.addChild(legs);

  // Table top
  const top = new Graphics();
  top.roundRect(-22, -4, 44, 14, 2);
  top.fill(COLORS.cardTableTop);
  top.stroke({ color: 0x5c3a2a, width: 1 });
  group.addChild(top);

  // Card icon on table
  const card = new Graphics();
  card.rect(-6, -2, 12, 9);
  card.fill(0xffffff);
  card.stroke({ color: 0x333333, width: 1 });
  group.addChild(card);

  // Label
  const label = new Text({
    text: "Stackjack",
    style: { fontFamily: "monospace", fontSize: 10, fill: "#cbd5e1" },
  });
  label.anchor.set(0.5, 0);
  label.x = 0;
  label.y = 26;
  group.addChild(label);

  return group;
}

function createCoffeeShop(
  x: number,
  y: number,
  app: Application,
  onClick?: () => void,
): Container {
  const group = new Container();
  group.x = x;
  group.y = y;
  group.eventMode = "static";
  group.cursor = "pointer";

  if (onClick) {
    group.on("pointerdown", onClick);
  }

  // Building body
  const body = new Graphics();
  body.rect(-30, -20, 60, 40);
  body.fill(COLORS.building);
  body.stroke({ color: 0x5c3a2a, width: 1 });
  group.addChild(body);

  // Roof
  const roof = new Graphics();
  roof.moveTo(-36, -20);
  roof.lineTo(0, -40);
  roof.lineTo(36, -20);
  roof.closePath();
  roof.fill(COLORS.roof);
  roof.stroke({ color: 0x8b3a1a, width: 1 });
  group.addChild(roof);

  // Door
  const door = new Graphics();
  door.rect(-8, 4, 16, 16);
  door.fill(0x3a2a1a);
  group.addChild(door);

  // Window
  const window1 = new Graphics();
  window1.rect(-24, -10, 12, 10);
  window1.fill(0xffd87040);
  window1.stroke({ color: 0x5c3a2a, width: 1 });
  group.addChild(window1);

  const window2 = new Graphics();
  window2.rect(12, -10, 12, 10);
  window2.fill(0xffd87040);
  window2.stroke({ color: 0x5c3a2a, width: 1 });
  group.addChild(window2);

  // Steam animation particles
  const steamParticles: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const steam = new Graphics();
    steam.circle(0, 0, 3);
    steam.fill({ color: COLORS.steam, alpha: 0.4 });
    steam.x = -5 + i * 5;
    steam.y = -42 - i * 6;
    group.addChild(steam);
    steamParticles.push(steam);
  }

  // Animate steam
  let elapsed = 0;
  app.ticker.add((ticker) => {
    elapsed += ticker.deltaTime * 0.03;
    steamParticles.forEach((p, i) => {
      const offset = elapsed + i * 2;
      p.y = -42 - i * 6 + Math.sin(offset) * 4 - elapsed % 8;
      p.alpha = 0.15 + 0.25 * Math.abs(Math.sin(offset * 0.5));
      // Reset when too high
      if (p.y < -70) {
        p.y = -42 - i * 6;
      }
    });
  });

  // Label
  const label = new Text({
    text: "Coffee Shop",
    style: { fontFamily: "monospace", fontSize: 10, fill: "#cbd5e1" },
  });
  label.anchor.set(0.5, 0);
  label.x = 0;
  label.y = 22;
  group.addChild(label);

  return group;
}
