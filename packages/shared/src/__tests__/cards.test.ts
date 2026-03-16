import { describe, it, expect } from "vitest";
import {
  BASE_CARD_CATALOG,
  createCard,
  getCardById,
  getStarterDeck,
  getCardsByRarity,
  getCardsByType,
  getNPCDeckCards,
  canPlayCard,
  calculateCardEffect,
} from "../types/cards.js";
import { CardType, ItemRarity } from "../types/game-state.js";

describe("BASE_CARD_CATALOG", () => {
  it("has unique card IDs", () => {
    const ids = BASE_CARD_CATALOG.map(card => card.id);
    const uniqueIds = new Set(ids);
    expect(ids).toHaveLength(uniqueIds.size);
  });

  it("contains all expected card types", () => {
    const cardTypes = BASE_CARD_CATALOG.map(card => card.type);
    const uniqueTypes = new Set(cardTypes);

    // Check all CardType enum values are present
    const expectedTypes = Object.values(CardType);
    expectedTypes.forEach(type => {
      expect(uniqueTypes.has(type)).toBe(true);
    });
  });

  it("has correct structure for all cards", () => {
    BASE_CARD_CATALOG.forEach(card => {
      expect(card).toHaveProperty("id");
      expect(card).toHaveProperty("name");
      expect(card).toHaveProperty("type");
      expect(card).toHaveProperty("rarity");
      expect(card).toHaveProperty("description");

      // ID and name should be non-empty strings
      expect(typeof card.id).toBe("string");
      expect(card.id).toBeTruthy();
      expect(typeof card.name).toBe("string");
      expect(card.name).toBeTruthy();

      // Type should be valid CardType
      expect(Object.values(CardType)).toContain(card.type);

      // Rarity should be valid ItemRarity
      expect(Object.values(ItemRarity)).toContain(card.rarity);

      // Description should be non-empty string
      expect(typeof card.description).toBe("string");
      expect(card.description).toBeTruthy();
    });
  });

  it("has correct values for plus/minus cards", () => {
    const plusCards = BASE_CARD_CATALOG.filter(card => card.type === CardType.Plus);
    const minusCards = BASE_CARD_CATALOG.filter(card => card.type === CardType.Minus);

    // Plus and minus cards should have numeric values
    plusCards.forEach(card => {
      expect(typeof card.value).toBe("number");
      expect(card.value).toBeGreaterThan(0);
    });

    minusCards.forEach(card => {
      expect(typeof card.value).toBe("number");
      expect(card.value).toBeGreaterThan(0);
    });

    // Should have multiple plus/minus cards
    expect(plusCards.length).toBeGreaterThanOrEqual(5);
    expect(minusCards.length).toBeGreaterThanOrEqual(5);
  });

  it("has flip cards with values", () => {
    const flipCards = BASE_CARD_CATALOG.filter(card => card.type === CardType.Flip);

    expect(flipCards.length).toBeGreaterThanOrEqual(3);
    flipCards.forEach(card => {
      expect(typeof card.value).toBe("number");
      expect(card.value).toBeGreaterThan(0);
    });
  });

  it("has special and legendary cards", () => {
    // Check for special card types
    const specialTypes = [CardType.Fork, CardType.Null, CardType.Rebase,
                         CardType.Merge, CardType.Recursive, CardType.Crit,
                         CardType.Overflow];

    specialTypes.forEach(type => {
      const cards = BASE_CARD_CATALOG.filter(card => card.type === type);
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    // Check for legendary cards
    const legendaryCards = BASE_CARD_CATALOG.filter(card => card.rarity === ItemRarity.Legendary);
    expect(legendaryCards.length).toBeGreaterThanOrEqual(2);
  });
});

describe("createCard", () => {
  it("creates valid card with all properties", () => {
    const card = createCard(
      "test-card",
      "Test Card",
      CardType.Plus,
      ItemRarity.Common,
      "A test card",
      5,
      "Test effect"
    );

    expect(card.id).toBe("test-card");
    expect(card.name).toBe("Test Card");
    expect(card.type).toBe(CardType.Plus);
    expect(card.rarity).toBe(ItemRarity.Common);
    expect(card.description).toBe("A test card");
    expect(card.value).toBe(5);
    expect(card.effect).toBe("Test effect");
  });

  it("creates card with optional parameters", () => {
    const card = createCard(
      "simple-card",
      "Simple",
      CardType.Null,
      ItemRarity.Uncommon,
      "A simple card"
    );

    expect(card.id).toBe("simple-card");
    expect(card.name).toBe("Simple");
    expect(card.type).toBe(CardType.Null);
    expect(card.rarity).toBe(ItemRarity.Uncommon);
    expect(card.description).toBe("A simple card");
    expect(card.value).toBeUndefined();
    expect(card.effect).toBeUndefined();
  });
});

describe("getCardById", () => {
  it("finds existing cards by ID", () => {
    const card = getCardById("plus-1");
    expect(card).toBeDefined();
    expect(card!.id).toBe("plus-1");
    expect(card!.type).toBe(CardType.Plus);
  });

  it("returns undefined for non-existent IDs", () => {
    const card = getCardById("non-existent-card");
    expect(card).toBeUndefined();
  });
});

describe("getStarterDeck", () => {
  it("returns exactly 6 cards", () => {
    const deck = getStarterDeck();
    expect(deck).toHaveLength(6);
  });

  it("returns expected starter cards", () => {
    const deck = getStarterDeck();
    const cardIds = deck.map(card => card.id);

    expect(cardIds).toContain("plus-1");
    expect(cardIds).toContain("plus-2");
    expect(cardIds).toContain("minus-1");
    expect(cardIds).toContain("minus-2");
    expect(cardIds).toContain("flip-1");
    expect(cardIds).toContain("flip-2");
  });

  it("returns all valid cards", () => {
    const deck = getStarterDeck();

    deck.forEach(card => {
      expect(card).toBeDefined();
      expect(card.id).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(Object.values(CardType)).toContain(card.type);
    });
  });
});

describe("getCardsByRarity", () => {
  it("returns only cards of specified rarity", () => {
    const commonCards = getCardsByRarity(ItemRarity.Common);
    expect(commonCards.length).toBeGreaterThan(0);

    commonCards.forEach(card => {
      expect(card.rarity).toBe(ItemRarity.Common);
    });
  });

  it("returns different counts for different rarities", () => {
    const commonCards = getCardsByRarity(ItemRarity.Common);
    const legendaryCards = getCardsByRarity(ItemRarity.Legendary);

    // Common should be more numerous than legendary
    expect(commonCards.length).toBeGreaterThan(legendaryCards.length);
  });
});

describe("getCardsByType", () => {
  it("returns only cards of specified type", () => {
    const plusCards = getCardsByType(CardType.Plus);
    expect(plusCards.length).toBeGreaterThan(0);

    plusCards.forEach(card => {
      expect(card.type).toBe(CardType.Plus);
    });
  });

  it("finds cards for all types", () => {
    const allTypes = Object.values(CardType);

    allTypes.forEach(type => {
      const cards = getCardsByType(type);
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("getNPCDeckCards", () => {
  it("returns common cards for easy difficulty", () => {
    const easyCards = getNPCDeckCards("easy");

    easyCards.forEach(card => {
      expect(card.rarity).toBe(ItemRarity.Common);
    });
  });

  it("returns common and uncommon cards for medium difficulty", () => {
    const mediumCards = getNPCDeckCards("medium");
    const rarities = new Set(mediumCards.map(card => card.rarity));

    expect(rarities.has(ItemRarity.Common)).toBe(true);
    expect(rarities.has(ItemRarity.Uncommon)).toBe(true);
  });

  it("returns uncommon and rare cards for hard difficulty", () => {
    const hardCards = getNPCDeckCards("hard");
    const rarities = new Set(hardCards.map(card => card.rarity));

    expect(rarities.has(ItemRarity.Uncommon)).toBe(true);
    expect(rarities.has(ItemRarity.Rare)).toBe(true);
  });

  it("defaults to easy for invalid difficulty", () => {
    const invalidCards = getNPCDeckCards("invalid" as "easy" | "medium" | "hard");
    const easyCards = getNPCDeckCards("easy");

    expect(invalidCards).toEqual(easyCards);
  });
});

describe("canPlayCard", () => {
  it("allows basic cards to be played", () => {
    const plusCard = getCardById("plus-1")!;
    expect(canPlayCard(plusCard, 10)).toBe(true);
  });

  it("prevents fork without opponent card", () => {
    const forkCard = getCardById("fork")!;
    expect(canPlayCard(forkCard, 10)).toBe(false);
    expect(canPlayCard(forkCard, 10, undefined, 5)).toBe(true);
  });

  it("prevents null without main card", () => {
    const nullCard = getCardById("null")!;
    expect(canPlayCard(nullCard, 10)).toBe(false);
    expect(canPlayCard(nullCard, 10, 0)).toBe(false); // Main card was 0
    expect(canPlayCard(nullCard, 10, 5)).toBe(true);
  });

  it("allows overflow only at exactly 20", () => {
    const overflowCard = getCardById("overflow")!;
    expect(canPlayCard(overflowCard, 19)).toBe(false);
    expect(canPlayCard(overflowCard, 20)).toBe(true);
    expect(canPlayCard(overflowCard, 21)).toBe(false);
  });
});

describe("calculateCardEffect", () => {
  it("calculates plus card effects correctly", () => {
    const plusCard = getCardById("plus-2")!;
    expect(calculateCardEffect(plusCard, 10)).toBe(2);
  });

  it("calculates minus card effects correctly", () => {
    const minusCard = getCardById("minus-3")!;
    expect(calculateCardEffect(minusCard, 10)).toBe(-3);
  });

  it("calculates flip card effects based on choice", () => {
    const flipCard = getCardById("flip-2")!;
    expect(calculateCardEffect(flipCard, 10, "plus")).toBe(2);
    expect(calculateCardEffect(flipCard, 10, "minus")).toBe(-2);
    expect(calculateCardEffect(flipCard, 10)).toBe(2); // defaults to plus
  });

  it("calculates fork effect from opponent card", () => {
    const forkCard = getCardById("fork")!;
    expect(calculateCardEffect(forkCard, 10, undefined, undefined, 7)).toBe(7);
    expect(calculateCardEffect(forkCard, 10)).toBe(0); // no opponent card
  });

  it("calculates null effect to cancel main card", () => {
    const nullCard = getCardById("null")!;
    expect(calculateCardEffect(nullCard, 10, undefined, 5)).toBe(-5);
  });

  it("calculates rebase effect to set total to 10", () => {
    const rebaseCard = getCardById("rebase")!;
    expect(calculateCardEffect(rebaseCard, 15)).toBe(-5); // 10 - 15
    expect(calculateCardEffect(rebaseCard, 5)).toBe(5); // 10 - 5
  });
});