# Stackjack: Card Game Rules

Stackjack is Crit Commit's collectible card mini-game. Inspired by Pazaak from KOTOR, with coding-themed modifier cards. Learn in 2 minutes, play in 3 minutes, collect cards forever.

---

## Goal

Get your total as close to **20** as possible without going over. Closest to 20 wins the round. **Win 3 rounds to win the match.**

---

## Decks

### Main Deck (Shared)

Cards numbered **1-10**. Each turn, one card is drawn automatically and added to your total. Neither player controls the main deck.

### Side Deck (Personal, 4 Cards)

Before each match, choose **4 cards** from your collection. These are your strategic tools — the only cards you control.

---

## Turn Flow

1. A **main deck card** is drawn and added to your total
2. Choose one action:
   - **End Turn** — Accept the draw. Opponent's turn.
   - **Play a Side Card** — Use one of your 4 cards to modify your total, then end turn.
   - **Stand** — Lock in your current total. No more draws this round. Your opponent keeps drawing until they also stand or bust.

---

## Busting

If your total exceeds **20**, you **bust** and lose the round immediately.

---

## Crit Hand

Landing **exactly on 20** is a Crit Hand. A Crit Hand beats a non-Crit 20 from the opponent. If both players have a Crit Hand, the round is a draw.

---

## Card Types

| Card | Effect | Rarity |
|------|--------|--------|
| **Plus (+1 to +5)** | Add to your total | Common (1-3), Uncommon (4-5) |
| **Minus (-1 to -5)** | Subtract from your total | Common (1-3), Uncommon (4-5) |
| **Flip (+/- 1 to 5)** | You choose to add or subtract | Common |
| **Fork** | Copy opponent's last main deck draw and add it to your total | Uncommon |
| **Null** | Cancel the current main deck draw (it becomes 0) | Uncommon |
| **Rebase** | Reset your total to 10 | Rare |
| **Merge** | Remove last two main deck draws, replace with their average (rounded down) | Rare |
| **Recursive** | Play this card, then draw one random bonus card from your collection and play it immediately (cannot chain into Recursive or Legendary) | Rare |
| **Crit Card** | Doubles the value of the next card played | Legendary |
| **Overflow** | If your total is exactly 20, set opponent to 21 (bust) | Legendary |

### Card Examples

**Merge in action:** You drew an 8 then a 3. Playing Merge replaces both with 5 (average of 8 and 3, rounded down). Net change: -6 from your total.

**Recursive in action:** You play Recursive. A random card from your collection is drawn — say, a +3. The +3 is played immediately. If the random draw were another Recursive or a Legendary, it would be skipped and a new card drawn.

**Crit Card in action:** You play the Crit Card, then play a +4 on your next turn. The +4 becomes +8.

---

## NPC Opponents

Each zone has 2-3 NPC opponents with themed decks and increasing difficulty. NPC behavior is deterministic (no AI token cost).

### Difficulty Tiers

| Tier | Stand Threshold | Side Card Strategy | Deck Composition |
|------|----------------|-------------------|------------------|
| **Easy** | Stands on 17+ | Plays cards randomly | Common cards only |
| **Medium** | Stands on 18+ | Plays cards to reach 17-20 range | Common + Uncommon |
| **Hard** | Stands on 19+ | Strategic play (Minus when over 20, Plus to reach 18-20, saves Null for high draws) | Uncommon + Rare, may hold one Legendary |

### Zone Themes

NPC decks match their zone's theme. Debug Depths NPCs favor Null and Rebase cards. Pipeline Forge NPCs lean on Merge and Fork. Beating all NPCs in a zone grants a **unique card** only available from that zone.

---

## Collecting Cards

Cards are earned through gameplay — never purchased.

| Source | What You Get |
|--------|-------------|
| Beating NPC opponents | Cards from their zone's pool |
| Quest rewards | Session and epic quests may drop cards |
| Rare encounter drops | Random chance from combat encounters |
| Ascension | Exclusive Ascension-only cards |
| Zone completion | Unique card for beating all NPCs in a zone |

---

## XP from Stackjack

| Outcome | XP |
|---------|-----|
| Win vs Easy NPC | 15 |
| Win vs Medium NPC | 25 |
| Win vs Hard NPC | 35 |

Stackjack is a fun side activity, not the primary progression path. Play it for cards, XP, and bragging rights.
