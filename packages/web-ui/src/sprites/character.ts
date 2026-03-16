import { Container, Graphics, Text, Application } from "pixi.js";

/** Class-to-color mapping. */
const CLASS_COLORS: Record<string, number> = {
  architect: 0x3b82f6,  // blue
  scout: 0x22c55e,      // green
  artificer: 0xf97316,  // orange
  battlemage: 0xa855f7,  // purple
};

const DEFAULT_COLOR = 0x94a3b8;

export interface CharacterSpriteOptions {
  name: string;
  characterClass: string;
  scale?: number;
}

/**
 * Creates a programmatic pixel-art character sprite.
 * Color varies by class. Includes idle Y-bounce animation on the app ticker.
 */
export function createCharacterSprite(
  app: Application,
  options: CharacterSpriteOptions,
): Container {
  const { name, characterClass, scale = 1 } = options;
  const color = CLASS_COLORS[characterClass] ?? DEFAULT_COLOR;
  const group = new Container();

  // Head
  const head = new Graphics();
  head.circle(0, -20, 8);
  head.fill(0xf5d0a9);
  head.stroke({ color: 0xd4a574, width: 1 });
  group.addChild(head);

  // Body
  const body = new Graphics();
  body.roundRect(-10, -12, 20, 22, 2);
  body.fill(color);
  body.stroke({ color: darken(color), width: 1 });
  group.addChild(body);

  // Legs
  const legs = new Graphics();
  legs.rect(-8, 10, 6, 12);
  legs.rect(2, 10, 6, 12);
  legs.fill(0x4a5568);
  group.addChild(legs);

  // Arms
  const arms = new Graphics();
  arms.rect(-14, -10, 4, 16);
  arms.rect(10, -10, 4, 16);
  arms.fill(color);
  arms.stroke({ color: darken(color), width: 1 });
  group.addChild(arms);

  // Eyes
  const eyes = new Graphics();
  eyes.circle(-3, -22, 1.5);
  eyes.circle(3, -22, 1.5);
  eyes.fill(0x1e293b);
  group.addChild(eyes);

  // Name label
  const label = new Text({
    text: name,
    style: {
      fontFamily: "monospace",
      fontSize: 9,
      fill: "#e2e8f0",
    },
  });
  label.anchor.set(0.5, 0);
  label.x = 0;
  label.y = 24;
  group.addChild(label);

  group.scale.set(scale);

  // Idle bounce animation
  const baseY = group.y;
  let elapsed = 0;
  const tickerCb = (ticker: { deltaTime: number }) => {
    elapsed += ticker.deltaTime * 0.05;
    group.y = baseY + Math.sin(elapsed) * 2;
  };
  app.ticker.add(tickerCb);

  // Stash cleanup reference
  (group as any).__idleTicker = tickerCb;

  return group;
}

/**
 * Creates a smaller party member sprite (0.7x scale by default).
 */
export function createPartyMemberSprite(
  app: Application,
  options: Omit<CharacterSpriteOptions, "scale">,
): Container {
  return createCharacterSprite(app, { ...options, scale: 0.7 });
}

/** Darken a hex color by ~25% for outlines. */
function darken(color: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - 50);
  const g = Math.max(0, ((color >> 8) & 0xff) - 50);
  const b = Math.max(0, (color & 0xff) - 50);
  return (r << 16) | (g << 8) | b;
}
