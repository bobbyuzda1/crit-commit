# Crit Commit: A Claude Code RPG — Game Design Specification

## Overview

Crit Commit is a coding RPG that watches Claude Code JSONL session transcripts and translates real coding activity into RPG gameplay — encounters, quests, progression, and narrative. Targeted at Claude Code power users. The game runs as a dedicated Claude Code project with a browser-based visual UI.

Every player's game is unique. Claude acts as the game master, generating narrative, rewards, encounters, and world-building based on each player's actual coding work and game progression. No two players experience the same game.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Character System](#2-character-system)
3. [Party System](#3-party-system)
4. [Crit System](#4-crit-system)
5. [Encounter System](#5-encounter-system)
6. [Quest System](#6-quest-system)
7. [World & Zones](#7-world--zones)
8. [Stackjack Card Game](#8-stackjack-card-game)
9. [Progression & Economy](#9-progression--economy)
10. [Security & Privacy](#10-security--privacy)
11. [Community (GitHub-Native)](#11-community-github-native)
12. [Token Efficiency](#12-token-efficiency)
13. [Visual Web UI](#13-visual-web-ui)
14. [Installation & First Run](#14-installation--first-run)
15. [Game Resilience & Recovery](#15-game-resilience--recovery)
16. [Labs Page (uzdavines.ai)](#16-labs-page-uzdavinesai)
17. [Build & Deploy Method](#17-build--deploy-method)

---

## 1. Architecture

Three-piece architecture with strict separation of concerns:

```
+-----------------------------------------------------------+
|  Player's Coding Terminals (1 or many)                    |
|  Normal Claude Code sessions doing real work               |
|  Generates JSONL transcripts at ~/.claude/projects/        |
+-----------------------------+-----------------------------+
                              | JSONL files on disk
                              v
+-----------------------------------------------------------+
|  Node.js Scanner (always running, zero token cost)        |
|  - Watches ~/.claude/projects/ for all session activity    |
|  - Extracts METADATA ONLY (tool names, counts, timing)     |
|  - Never reads source code, file contents, or secrets      |
|  - Batches events into compact summaries                   |
|  - Player-configurable batch interval (default 5 min)      |
+-----------------------------+-----------------------------+
                              | Compact event summaries
                              v
+-----------------------------------------------------------+
|  Game Engine Terminal (1 dedicated Claude Code session)    |
|  - Claude IS the game master                               |
|  - Receives batched event summaries, never raw code        |
|  - Generates narrative, rewards, encounters, quests        |
|  - Maintains persistent game state on disk (JSON files)    |
|  - ~90% LLM-powered creative decisions, ~10% rules engine  |
|  - Uses player's existing Claude Code auth (no extra key)  |
+-----------------------------+-----------------------------+
                              | Game state updates
                              v
+-----------------------------------------------------------+
|  Visual Web UI (browser at localhost)                     |
|  - PixiJS + pixel art rendering (16x16 tiles)             |
|  - Character, party, zones, encounters, animations         |
|  - Stackjack card game table                               |
|  - Quest log, event feed, stats dashboard                  |
+-----------------------------------------------------------+
```

### Integration: How the three pieces communicate

**Scanner to Game Engine:** The Node.js scanner writes batched event summaries to `~/.crit-commit/cache/pending-events.json` on each batch interval. It then invokes `claude -p` (Claude Code CLI in headless/print mode) with a structured prompt that includes the pending events and current game state. Claude processes the events, generates narrative/rewards/encounters, and outputs a structured JSON response. The scanner parses this response, updates `game-state.json`, clears the pending events, and pushes the new state to the web UI. Each `claude -p` call is stateless — context comes entirely from the files on disk.

**Scanner to Web UI:** The Node.js scanner also serves as the HTTP server for the web UI. It serves the static PixiJS web app and maintains a WebSocket connection to push real-time game state updates to the browser. When `game-state.json` changes (after a Claude call or a micro-quest completion), the scanner sends the delta over WebSocket. The web UI never polls — it receives push updates only.

**Web UI to Scanner:** Player actions in the browser (equip materia, choose a zone, play Stackjack, change settings) are sent back to the scanner over the same WebSocket connection. The scanner updates `game-state.json` immediately for local actions (settings, Stackjack) or queues them for the next Claude batch call (zone choice, quest selection).

### Relationship to foundation research document

The original `RPG-Foundation-Doc.md` was researched around a VS Code extension architecture. This design pivots to a standalone Node.js + browser architecture with no VS Code dependency. The foundation doc's research on JSONL transcript schema (Section 3), RPG mechanics (Section 5), competitive landscape (Section 6), cultural references (Section 7), and pixel art approach (Section 8) remain fully applicable. The VS Code-specific sections (1, 2, 4) are no longer relevant to this architecture but may inform a future VS Code wrapper.

### Cross-platform support

Works on Windows, Linux, and Mac. The Node.js scanner handles OS-specific JSONL paths and filesystem watching differences (inotify on Linux, FSEvents on Mac, ReadDirectoryChangesW on Windows). No VS Code dependency — the game runs in any terminal and renders in any browser.

### Multi-user support (Linux)

Players who use multiple Linux user accounts for different projects need the scanner to watch JSONL directories across all of them. The scanner accepts a configurable **watch paths list** rather than only watching the current user's `~/.claude/projects/`.

**Settings configuration:**
```json
{
  "watchPaths": [
    "/home/bobby/.claude/projects",
    "/home/devuser/.claude/projects",
    "/home/salesforce-dev/.claude/projects"
  ]
}
```

**First-run auto-detection:** During character creation, the scanner scans `/home/*/.claude/projects/` (Linux/Mac) to find all Claude Code installations. For each, it tests read access. Accessible paths are auto-added to `watchPaths`. Inaccessible paths are flagged with setup instructions.

**Permission setup (shared group approach):**
```bash
# One-time setup: create a group and add all dev users
sudo groupadd claude-watchers
sudo usermod -aG claude-watchers bobby
sudo usermod -aG claude-watchers devuser

# For each user's .claude directory, grant group read access
chmod 750 /home/devuser/.claude
chmod -R g+r /home/devuser/.claude/projects
chgrp -R claude-watchers /home/devuser/.claude/projects
```

The game itself should NEVER run as root. It runs as whichever user launches it, and the shared group grants read-only access to other users' JSONL transcripts. The scanner only reads transcript metadata — it never modifies any user's files.

**On Windows and Mac:** Typically only one user account is used for development, so `watchPaths` defaults to a single entry (`~/.claude/projects/`). The multi-path feature is available but not emphasized during first-run.

### JSONL source data

Claude Code stores session transcripts at `~/.claude/projects/<encoded-project-path>/<session-id>.jsonl`. The schema is a discriminated union on the `type` field with six entry types: `summary`, `user`, `assistant`, `system`, `queue-operation`, and `file-history-snapshot`.

Tool use is recorded as `tool_use` blocks with names: Bash, Glob, Grep, LS, Read, Edit, MultiEdit, Write, WebFetch, WebSearch, TodoWrite, TodoRead, Task, Explore, ExitPlanMode.

Sub-agents are created via the Task tool and stored in separate files. Sub-agent messages have `isSidechain: true` and a unique `agentId`.

The `system` entry with subtype `turn_duration` is the most reliable signal for turn completion (~98% for tool-using turns).

---

## 2. Character System

### Player character

- One character per player, user-named at first run
- Class chosen once during character creation
- Progression through leveling, materia, and gear

### Classes (4 starter classes)

| Class | Archetype | Strength | Passive |
|-------|-----------|----------|---------|
| Architect | Backend/systems thinker | Bonus XP from Bash, complex file edits | "Blueprint" — sees quest objectives more clearly |
| Scout | Debugger/investigator | Bonus XP from Read, Grep, search patterns | "Tracker" — finds rare card drops more often, natural crit chance bonus |
| Artificer | Builder/creator | Bonus XP from Write, new file creation | "Craftsmanship" — better gear drops |
| Battlemage | Full-stack generalist | No bonus, no penalty — flat XP from everything | "Versatility" — can equip any materia type |

### Materia system (3 types)

Materia are equippable coding skill orbs that gain AP from relevant activity and level 1-5 through use.

| Type | Color | What it tracks | Examples |
|------|-------|----------------|----------|
| Skill | Green | Languages and frameworks detected in sessions | TypeScript, Python, React, SQL |
| Tool | Yellow | Developer tool usage from JSONL tool names | Terminal, Search, Editor, Git |
| Spirit | Red | AI-specific activity — sub-agents, complex prompts | Summoner, Strategist, Architect |

Higher levels unlock stronger passive bonuses. No linked slots or mastery spawning in v1 — those can be added in future updates.

### Stats

- **Crit Chance** — Probability of triggering a Crit on qualifying events. Grows with level, gear, and materia. Scout class gets a natural bonus.
- **Crit Multiplier** — Starts at 2x. Boosted by equipment. Legendary items can push to 4x.
- **XP Bonus** — Percentage modifier on all XP earned. From class passives, materia, and gear.

### Gear

4 rarity tiers:

| Tier | Conditional Drop Rate | Source | Examples |
|------|----------------------|--------|----------|
| Common | ~60% | Micro-quests, basic encounters | Small potions, basic weapon skins |
| Uncommon | ~25% | Session quests, Stackjack wins | Named weapons, materia boosters |
| Rare | ~12% | Epic quests, zone bosses | Unique gear with passive effects, rare Stackjack cards |
| Legendary | ~3% | Ascension rewards, major milestones | One-of-a-kind items Claude names based on coding history |

These are conditional probabilities — given that a drop occurs. Not every encounter drops an item. Base drop chance is ~50% for regular encounters, ~80% for quest completions, 100% for boss defeats and Crits.

Legendary items are uniquely generated by the game engine. Example: "The Mass Migrator — forged in the fires of your 47-table database migration. +10% XP from all database-related activity."

---

## 3. Party System

### Terminal companions

Each active Claude Code coding terminal becomes a companion NPC in the game world. When a new Claude Code session starts, the Node.js scanner detects the new JSONL file and signals the game engine. Claude generates an NPC with:

- A **name blending pop culture characters with coding context** (see NPC Naming below)
- A **class** based on what the terminal is doing (a terminal running tests might be a Cleric, one refactoring might be a Fighter)
- **Combat participation** alongside the player

### NPC naming system

NPC names blend iconic franchise characters with coding concepts relevant to the terminal's activity. Inspiration sources: Star Wars, Lord of the Rings, Zelda, Final Fantasy, The Matrix, Super Mario, Ninja Turtles, and other popular franchises.

Examples:

| Terminal Activity | Generated NPC Name | Inspiration |
|---|---|---|
| Running Python tests | Darth Pytest | Star Wars + pytest |
| TypeScript refactoring | Gandalf the Typed | LOTR + TypeScript |
| Database queries | Link of the Lost Tables | Zelda + SQL |
| Docker/containers | Morpheus Container | Matrix + Docker |
| React frontend work | Tifa Reacthart | FF7 + React |
| Git operations | Luigi Rebase | Mario + git rebase |
| Security/auth work | Donatello Shell | TMNT + shell |
| Sub-agent research | R2-Grep2 | Star Wars + grep |
| Debugging | Frodo Debuggins | LOTR + debugging |
| API integration | Neo Endpoint | Matrix + API |

The game engine prompt includes the franchise list as inspiration sources. Since Claude generates these dynamically, every name is unique and contextual.

### Sub-agent summons

When Claude Code spawns a sub-agent within any terminal, a summoned creature appears in the game world. It is short-lived and powerful, tied to the sub-agent's lifespan. When the sub-agent finishes, the creature delivers its reward and disappears.

### Idle terminals

Terminals that go idle (no JSONL activity for 10+ minutes) become "resting" NPCs at camp. They may offer flavor dialogue. When activity resumes, they rejoin the party.

### Zero terminals state

When no coding terminals are active, the player character is alone in Cloud City Base Camp. No encounters generate, no session quests progress. The visual UI shows the character at camp with ambient animations. The player can still: manage inventory/materia, play Stackjack against NPCs, browse the world map, and review quest log. When a coding terminal starts, the game resumes immediately.

### Party dynamics

More terminals = bigger party = harder encounters available, better rewards. All activity feeds the player character's progression.

---

## 4. Crit System

Crits are the signature mechanic of the game — the heartbeat of Crit Commit. A Crit triggers when coding produces exceptional outcomes.

### Crit types

| Coding Achievement | Crit Type | Effect |
|---|---|---|
| All tests pass on first run | Crit Strike | 3x XP for that encounter, rare item drop chance doubles |
| Fix a bug with multiple test failures | Crit Recovery | Bonus XP + party morale boost (temporary XP multiplier) |
| Deploy/push with zero errors | Crit Deploy | Boss-finishing blow animation, guaranteed loot drop |
| Long focused session (60+ min sustained) | Crit Focus | Limit Break gauge fills instantly |
| First commit of a new project | Crit Genesis | New zone discovery bonus, unique materia seed |
| Merge a large PR / resolve merge conflict | Crit Merge | Party fusion attack — all companions strike together |
| Sub-agent completes successfully | Crit Summon | Summoned creature delivers double rewards |

### Crit stats

- **Crit Chance:** Grows with level and gear. ~5% at level 1, ~25% at level 20. Scout class gets a natural bonus. Certain materia and gear boost it further.
- **Crit Multiplier:** Starts at 2x. Boosted by equipment. Legendary items can push to 4x.

### Crit Streak

Landing 3 Crits in a single session triggers a Crit Streak — a temporary buff where all XP is doubled and every encounter drops loot for the rest of that batch interval. Rare and thrilling.

### Visual feedback

When a Crit triggers, the visual UI shows: screen shake, golden particle burst, the word "CRIT!" in large pixel art text. It should feel exciting every time.

### Crits in Stackjack

- **Crit Hand:** Landing exactly on 20 beats a non-Crit 20 from the opponent (tiebreaker)
- **Crit Card:** Legendary-rarity card that doubles the value of whatever card is played next

---

## 5. Encounter System

### Event-driven encounters

The game engine generates encounters based on coding events detected by the scanner:

| Coding Event | Game Encounter |
|---|---|
| Test failure | Bug monster spawns — difficulty scales with number of failures |
| Lint/type errors | Trap or hazard in the current zone |
| Merge conflict | Conflict Wraith boss encounter |
| Long debugging session (many Read/Grep cycles) | Dungeon exploration — deeper search = harder enemies |
| New dependency added | Merchant arrives with gear (or a mimic if dep is sketchy) |
| Successful deploy/push | Boss defeated, loot drop |
| Tests red to green | Battle won — XP scales with how many tests fixed |
| Force push | High-risk gamble — huge reward or huge penalty |
| Sub-agent spawned | Summoned creature joins the fight |
| Terminal idle > 10 min | Enemies retreat, camp phase, rested XP bonus on return |

### Auto-battle

Combat is auto-resolved with visual flair. The player does a `git push` and the game shows their character unleashing an attack on a boss. The "playing" happens in the strategic layer — choosing classes, equipping materia, picking quests, managing Stackjack deck.

### The 3-second rule

Any RPG interaction should take no more than 3 seconds before the developer returns to coding. Queue rewards for natural break points. Never interrupt deep work.

---

## 6. Quest System

### Three tiers

**Tier 1: Micro-quests (3 slots, always active)**

Generated by the Node.js scanner with zero token cost. Pure pattern matching:

| Coding Pattern | Quest | XP |
|---|---|---|
| 5 file edits | "Edit 5 files" | 10-25 |
| 3 Grep/Read searches | "Investigate the codebase" | 10-25 |
| Run tests | "Test your mettle" | Scales with pass/fail |
| First commit of the day | "Dawn Patrol" | 25 (daily bonus) |
| Use a new language/framework | "Foreign Lands" | 25 (exploration bonus) |

Auto-rotate when completed. Always ticking in background.

**Tier 2: Session quests (2 slots)**

Generated by the game engine (Claude) each batch interval. Contextual and narrative-driven, referencing the player's real work patterns.

Example: *"The Legacy Module Caverns grow darker. Three test failures echo through the halls — the Bug Swarm grows stronger. Defeat them by making all tests pass before your session ends."*

XP: 50-150 + item drops.

**Tier 3: Epic quests (1 slot)**

Generated when the game engine detects large-scale work patterns — a new feature branch, a major refactor, a migration. Multi-stage, span multiple sessions.

Example: *"The Great Migration — Chapter 1 of 4: The old database schema crumbles. Begin the journey by creating the new models."*

XP: 200-500 per stage. Rare rewards on completion.

### Stale quest retirement

Quests that become irrelevant retire gracefully with narrative flavor: *"The Bug Swarm retreated into the shadows... for now."*

### Token cost

Micro-quests are free. Session and epic quests are generated within the already-scheduled batch interval Claude calls — no extra calls needed.

---

## 7. World & Zones

### Cloud City Base Camp (permanent home zone)

The player's hub. Always available. Contains:
- Character and party NPCs
- Quest board
- Stackjack card table
- Inventory and gear management
- Party rest area
- **Coffee shop element** — subtle pixel art coffee cart/shop. Clickable. Opens a modal: "Fuel your quest with real coffee! Use code AgentQ10 for 10% off at Cloud City Roasters." Copy-to-clipboard button for the code, then a "Visit Shop" button linking to CloudCityRoasters.com.

### Dynamic zone generation

Zones generate from the player's actual coding patterns. The Node.js scanner tracks languages, frameworks, and tools used. When enough activity accumulates in a category, the game engine generates **two zone options** with different gameplay modifiers. The player chooses one.

Example choice:

> "Your mastery of TypeScript has opened a rift in the clouds. Two paths shimmer before you:
>
> **The Azure Spires** — A crystalline city of strict types. Bonus: +15% XP from typed languages. Enemies weaker but puzzles harder.
>
> **The Flux Wastes** — A chaotic, shifting landscape. Bonus: +15% rare card drops. Enemies unpredictable but loot is better.
>
> Choose your path."

### Example zone themes by coding activity

| Player's Coding Activity | Possible Zone | Flavor |
|---|---|---|
| Heavy Python work | The Serpent Gardens | Winding vine-covered paths, snake creatures, green mist |
| Database queries | The Crystal Vaults | Underground caverns, data crystals, table-shaped formations |
| React/frontend work | The Prism Towers | Colorful spires, component architecture, light refraction |
| DevOps/CI-CD | The Pipeline Forge | Industrial, flowing lava channels, automated machinery |
| Heavy Git operations | The Branching Wilds | Forest where paths fork and merge, timeline distortions |
| Security/auth work | The Shadow Keep | Dark fortress, locked gates, key-based puzzles |
| API/integration work | The Bridge Nexus | Floating bridges connecting islands, message carriers |

### Zone limits

Maximum 6 active zones + Cloud City Base Camp. If a 7th zone unlocks, the player chooses one to archive — it stays on the map grayed out and can be revisited but no longer generates encounters.

### Unique world per player

Every player's world map is different because zones generate from their personal coding history. The same coding activity can produce different zones based on the choice the player makes. Combined with Claude's narrative generation, no two worlds are alike.

---

## 8. Stackjack Card Game

### Overview

Stackjack is Crit Commit's collectible card mini-game. Inspired by Pazaak from KOTOR, with coding-themed modifier cards. Learn in 2 minutes, play in 3 minutes, collect cards forever.

### Core rules

1. **Goal:** Get your total as close to 20 as possible without going over. Closest to 20 wins the round. Win 3 rounds to win the match.
2. **Main deck (shared):** Cards numbered 1-10. Each turn, one card is drawn automatically and added to your total. Neither player controls this.
3. **Side deck (personal, 4 cards):** Before each match, choose 4 cards from your collection. These are your strategic tools.
4. **Turn flow:** Main deck card is drawn and added to total. Then choose one action:
   - **End Turn** — Accept the draw. Next player's turn.
   - **Play a Side Card** — Use one of your 4 cards to modify your total. Then end turn.
   - **Stand** — Lock in your current total. No more draws this round. Opponent keeps drawing until they stand or bust.
5. **Busting:** Total exceeds 20 = bust = lose the round immediately.
6. **Crit Hand:** Landing exactly on 20 beats a non-Crit 20 (tiebreaker).

### Card types

| Card Type | Effect | Rarity |
|---|---|---|
| Plus (+1 to +5) | Add to total | Common (1-3), Uncommon (4-5) |
| Minus (-1 to -5) | Subtract from total | Common (1-3), Uncommon (4-5) |
| Flip (plus/minus 1-5) | Player chooses + or - | Common |
| Fork | Copy opponent's last main deck draw, add to your total | Uncommon |
| Null | Cancel current main deck draw (becomes 0) | Uncommon |
| Rebase | Reset your total to 10 | Rare |
| Merge | Remove the last two main deck draws from your total, replace with their average (rounded down). Example: drew 8 then 3, Merge replaces them with 5 (net -6). | Rare |
| Recursive | Play this card, then draw one random bonus card from your collection and play it immediately. The bonus card cannot be another Recursive or a Legendary. | Rare |
| Crit Card | Doubles the value of the next card played | Legendary |
| Overflow | If your total is exactly 20, set opponent to 21 (bust) | Legendary |

### Card collection

Cards are earned through gameplay, not purchased:

- Beating NPC opponents (2-3 per zone, with increasing difficulty)
- Quest rewards (session and epic quests)
- Rare drops from encounters
- Ascension-exclusive cards (only available after prestiging)

Zone-specific NPCs have themed decks (Debug Depths NPCs use Null and Rebase cards). Beating all NPCs in a zone grants a unique card only available from that zone.

### NPC opponent AI (deterministic, zero token cost)

NPC opponents are controlled by a rules-based AI in the game engine's local code — no Claude calls needed. Difficulty scales through three tiers:

**Easy NPCs (early zones):**
- Stand on 17+
- Play side cards randomly
- Side deck contains only Common cards

**Medium NPCs (mid zones):**
- Stand on 18+
- Play side cards when they help reach 17-20 range
- Side deck contains Common + Uncommon cards

**Hard NPCs (late zones, Ascension):**
- Stand on 19+
- Play side cards strategically (use Minus when over 20, use Plus to reach 18-20, save Null for high draws)
- Side deck contains Uncommon + Rare cards
- May hold one Legendary card

NPC decks are pre-defined per zone (stored in game data JSON files), not generated per match. Each NPC has a name, a portrait, a fixed side deck, and a difficulty tier.

### XP from Stackjack

Winning a match: 15-35 XP (scales with NPC difficulty tier). The card game is a fun side activity, not the primary progression path.

---

## 9. Progression & Economy

### Leveling curve

| Level Range | XP Per Level | Approximate Time | Design Intent |
|---|---|---|---|
| 1-5 | Low | First day of coding | Hook the player fast |
| 6-10 | Moderate | ~1 week | Steady dopamine, zones unlocking, materia leveling |
| 11-15 | Higher | ~2-3 weeks | Mid-game investment, epic quests drive progression |
| 16-20 | Steep | ~1-2 months | Levels feel like real achievements, rare drops matter |
| 20 | Cap | — | Ascension available |

### XP sources

| Activity | XP | Notes |
|---|---|---|
| Micro-quest completed | 10-25 | Background steady drip |
| Session quest completed | 50-150 | Main progression driver |
| Epic quest stage completed | 200-500 | Big milestone reward |
| Tests passing (per batch) | 5-30 | Scales with count |
| Bug fixed (test red to green) | 30-75 | Rewards persistence |
| Git push | 20-40 | Shipping matters |
| Stackjack match won | 15-35 | Side activity reward |
| New zone unlocked | 100 | Exploration bonus |
| First session of the day | 25 | Daily login bonus |
| Return after 2+ days | 50 | Anti-burnout rested XP |

### Anti-grind protections

- Diminishing returns on repetitive actions (editing same file 50 times gives less XP each time)
- Game engine detects suspicious patterns and addresses them narratively: *"The forest spirits grow suspicious of your repetitive incantations..."*
- Rewards outcomes (tests passing, bugs fixed) rather than inputs (lines of code, time spent)

### Ascension (prestige system)

At level 20, the player can Ascend:

- Reset level to 1
- Earn an Ascension Star (visible on leaderboard, profile, character sprite)
- Choose a permanent passive bonus from options Claude generates based on playstyle
- World zones stay unlocked but enemies scale harder
- Ascension-only Stackjack cards become available
- Character sprite gets a visual upgrade (glow, armor, etc.)

Players can Ascend multiple times. A 5-star Ascended player is a legend on the community leaderboard. Infinite endgame without infinite content.

---

## 10. Security & Privacy

### Data extraction rules

The Node.js scanner extracts ONLY metadata from JSONL transcripts. It parses `tool_use` blocks structurally, extracting specific fields while ignoring content.

| Extracted (safe) | How extracted | NEVER extracted |
|---|---|---|
| Tool name (Edit, Bash, Read, etc.) | `tool_use.name` field | File contents or code |
| File extensions (.ts, .py, .sql) | Regex on `tool_use.input.file_path` — extracts only the extension, discards the path | Full file paths |
| Number of files touched per tool | Count of tool_use blocks per type | Variable or function names |
| Test pass/fail signals | Regex on `tool_result` content for common test runner patterns: "X passed", "X failed", "PASS", "FAIL", exit codes | Full test output or error messages |
| Git operation type | Regex on Bash `tool_use.input.command` for `git push`, `git commit`, `git merge`, etc. — extracts only the git subcommand | Commit messages or diff content |
| Sub-agent lifecycle | `isSidechain` flag, `agentId`, Task tool_use blocks | Sub-agent conversation content |
| Timestamps and durations | `timestamp`, `durationMs` fields | Any conversation text |

**Language detection:** Determined from file extensions found in `tool_use.input.file_path` fields (e.g., `.ts` = TypeScript, `.py` = Python). Only the extension is extracted — the full path is discarded immediately after parsing. The scanner maintains a running set of detected languages in `pending-events.json`.

**Test result detection:** The scanner uses regex patterns against `tool_result` content blocks for common test runners (Jest: `/Tests:\s+(\d+) passed, (\d+) failed/`, pytest: `/(\d+) passed, (\d+) failed/`, generic: exit code 0 = pass, non-zero = fail). This is a heuristic — not all test output will be detected, and that is acceptable. Undetected test runs are treated as generic Bash commands.

**Micro-quest detection specifics:**
- "Edit 5 files" — count of Edit/Write tool_use blocks
- "Investigate the codebase" — count of Read/Grep/Glob tool_use blocks
- "Run tests" — detected via test runner patterns above
- "Dawn Patrol" — first Bash tool_use of the calendar day containing a git commit pattern
- "Foreign Lands" — new file extension not previously seen in the player's `languages_detected` set

### Content filtering

- A content filter in the Node.js layer strips anything resembling a secret (regex for API keys, tokens, passwords) before it reaches the game engine
- The game engine system prompt explicitly instructs Claude to never reference real filenames, project names, or code in narrative output
- All AI-generated content (narrative, items, quests) is inherently clean via Claude's built-in safety

### Community publishing safety

- Player controls exactly what gets shared — preview before submit
- Only game data transmitted: character name, level, class, zone, quest summaries, Stackjack stats, storyline excerpts (AI-generated fiction, not coding logs)
- Profanity filter (`bad-words` npm package or equivalent) on player-chosen character names before community publish
- Community submissions are append-only — no editing others' content, no comments in v1

### No liability architecture

- No source code, project names, or real coding data ever leaves the player's machine
- Community platform is GitHub-native — GitHub handles hosting, auth, and moderation
- No custom backend, no database with user data, no PII collection

---

## 11. Community (GitHub-Native)

### Repository

`bobbyuzda1/crit-commit-community` — public repo for leaderboards, player profiles, and Stackjack rankings.

### Features

| Feature | Implementation | Cost |
|---|---|---|
| Leaderboards | Auto-updated JSON files in community repo. Players submit via game CLI. GitHub Action validates (format + profanity filter) and merges. | Free |
| Storyline sharing | GitHub Discussions on the main Crit Commit repo. One-command publish from game. | Free |
| Player profiles | Auto-generated markdown files in community repo — character card display. | Free |
| Stackjack rankings | Separate leaderboard JSON for card game stats. | Free |

### Authentication

No new accounts needed. Every Claude Code user has a GitHub account. The game uses `gh` CLI (GitHub CLI) for submissions — already installed by most developers.

### Submission flow

```
Game: "You've completed The Great Migration! Share your achievement?"
Player: "yes"
Game: gh api ... (submits score + storyline excerpt to community repo)
Done. Shows up on leaderboard within minutes.
```

### Moderation

GitHub Actions validates all submissions automatically:
- JSON schema validation
- Profanity filter on text fields
- Rate limiting (max submissions per hour)
- GitHub's built-in moderation tools (flag, block, delete) available to repo maintainer

### Design for growth

This is intentionally minimal. No custom infrastructure, no backend, no hosting costs. If the game grows large enough to warrant a richer community platform, it can be built later — the submission API format stays the same.

---

## 12. Token Efficiency

### Zero-cost layer (Node.js scanner)

The scanner runs continuously with zero token cost:
- File watching on `~/.claude/projects/` using native OS APIs (inotify on Linux, FSEvents on Mac, ReadDirectoryChangesW on Windows)
- Regex/string pattern matching on JSONL lines for tool names, event types, timing
- Event batching into compact summaries
- Micro-quest generation from rules engine

### Claude game engine calls

- Triggered on player-configurable batch interval (default 5 minutes)
- Each call receives ~500-1000 input tokens: compact event summary + current game state
- Estimated 6-12 calls per hour of active coding
- Each call generates: narrative updates, encounter resolution, quest generation/progress, reward decisions
- Session and epic quests generated within these scheduled calls — no extra calls

### Batch payload example

```json
{
  "events": {
    "edits": 7,
    "tests_passed": 12,
    "tests_failed": 3,
    "grep_searches": 5,
    "git_push": 1,
    "sub_agents_spawned": 2,
    "sub_agents_completed": 1
  },
  "languages_detected": ["typescript", "python"],
  "terminals_active": 3,
  "session_duration_min": 45,
  "game_state": {
    "level": 7,
    "class": "Architect",
    "zone": "Debug Depths",
    "active_quests": ["Clear the Legacy Module (2/4)", "Edit 5 files (3/5)"],
    "party_size": 3,
    "crit_chance": 0.12
  }
}
```

---

## 13. Visual Web UI

### Serving architecture

The Node.js scanner serves the web UI. It runs an Express (or Fastify) HTTP server on a configurable localhost port (default 3333) that:
- Serves the pre-built static PixiJS web app (HTML, JS, CSS, sprite sheets)
- Maintains a WebSocket connection for real-time game state push updates
- Accepts player actions (equip, zone choice, Stackjack moves, settings) over WebSocket
- During development: Vite dev server with hot reload. In production: pre-built static files served by the scanner's HTTP server.

### Rendering engine

PixiJS with pixel art assets. 16x16 tiles for environments, 32x32 or 16x16 scaled 2x for character sprites. Integer-only zoom levels, `image-rendering: pixelated` CSS. WebGL rendering with Canvas 2D fallback.

### Layout

```
+--------------------------------------+
|  [World Map]     [Character]  [Cards]|
|                                      |
|   * Your character + party NPCs      |
|   * Current zone background          |
|   * Active encounter (if fighting)   |
|   * Ambient animations               |
|   * Crit animations when triggered   |
|                                      |
+--------------------------------------+
|  Quest Log  |  Event Feed  |  Stats  |
|  ---------  |  ----------  |  -----  |
|  * Quest 1  |  Slayed a    |  Lv.12  |
|  o Quest 2  |  null bug!   |  XP:### |
|  # Epic     |  +45 XP      |  HP:89  |
+--------------------------------------+
|  Settings: [Batch Interval Slider]   |
+--------------------------------------+
|  [Donate] [Coffee] Credits | v1.0.0  |
+--------------------------------------+
```

### Key UI elements

- **Top area:** Pixel art canvas — character, party, current zone, encounters, animations
- **Bottom dashboard:** Quest log, real-time event feed, character stats
- **Settings:** Batch interval slider, display preferences
- **Footer:** Donation button (opens modal), coffee mug icon (links to CloudCityRoasters.com), credits/dev info
- **In-game (Base Camp):** Pixel art coffee shop — clickable, opens modal with "AgentQ10" discount code, copy button, "Visit Shop" link to CloudCityRoasters.com

### Crit visual feedback

When a Crit triggers: screen shake, golden particle burst, "CRIT!" in large pixel art text. Every Crit should feel exciting.

### Status indicators

| Status | Display |
|---|---|
| Everything normal | Green dot + "Game Active" |
| Scanner running, Claude offline | Yellow dot + "Game Engine Reconnecting..." |
| Scanner stopped | Red dot + "Scanner Offline — run crit-commit start" |
| Catching up after gap | Blue dot + "Catching up on your adventures..." |

### Asset sources (all free, open license)

- Kenney.nl (CC0): 60,000+ assets including RPG sets
- Liberated Pixel Cup (CC-BY-SA 3.0): Modular RPG character sprites
- OpenGameArt.org (various CC): DawnLike 16x16 tileset, 496 item icons
- Dark IDE-friendly palettes (Dracula-style: bright greens, cyans, oranges against deep blues)

---

## 14. Installation & First Run

### Installation

```bash
npx crit-commit init
```

One command. Published as an npm package. Downloads and sets up the Node.js scanner, game engine configuration, and visual web UI. Detects OS (Windows/Mac/Linux), finds `~/.claude/projects/`, and confirms the path. Creates the `~/.crit-commit/` directory structure.

Alternative installation methods:
```bash
npm install -g crit-commit    # Global install
git clone https://github.com/bobbyuzda1/crit-commit && cd crit-commit && npm install  # From source
```

If/when a Claude Code marketplace or plugin system becomes available, the game will also be listed there.

### First-run experience

1. **Name your character** — free text input
2. **Choose your class** — Architect, Scout, Artificer, or Battlemage (with one-line descriptions)
3. **Existing history scan** — if the player has existing JSONL history, the game engine fast-forwards starting state: *"The spirits sense your history... you've written much TypeScript and wielded Git with skill."* Starting materia and level reflect real history.
4. **Cloud City Base Camp renders** in the browser — character appears, quest board populates, game is live

For brand new Claude Code users with no history: fresh start at level 1 with no materia.

**History scan bounds:** The scanner pre-processes existing JSONL files locally (zero token cost) to produce a compact summary: total tool counts by type, languages detected, total sessions, date range. This is capped at the most recent 30 days or 50 sessions (whichever is smaller) to keep the summary compact. The resulting summary (~200 tokens) is sent to one Claude call to generate starting gear, materia, and a narrative welcome message. The Claude call never sees raw transcripts — only the pre-digested statistics.

---

## 15. Game Resilience & Recovery

### Continuous state persistence

The Node.js scanner maintains the authoritative game state and writes to disk immediately on every change:

```
~/.crit-commit/
+-- save/
|   +-- game-state.json          # Full current state
|   +-- game-state.backup.json   # Previous save (auto-rotated before each write)
|   +-- history.jsonl            # Append-only log of every game event with timestamps
|   +-- session-log.json         # Current session metadata
+-- config/
|   +-- settings.json            # Player preferences (batch interval, display)
|   +-- character.json           # Character creation choices (name, class)
+-- cache/
    +-- pending-events.json      # Events accumulated since last Claude batch call
```

### Failure recovery matrix

| Failure Scenario | What Happens | Recovery |
|---|---|---|
| Claude API outage | Scanner keeps running, accumulates events in pending-events.json. Visual UI stays active showing last known state. "Game Engine Offline" indicator appears. | When Claude returns, next batch receives ALL accumulated events. Game engine generates catch-up narrative. |
| Internet loss | Scanner still works (reads local JSONL files). Events accumulate locally. Visual UI still works (localhost). | Same catch-up on reconnect. |
| Game terminal crash/stall | game-state.json already saved. Nothing lost. | Run `crit-commit start`. Scanner reads saved state and resumes. New Claude session reads history.jsonl tail + pending-events.json. Game continues exactly where it left off. |
| Player closes everything | All state on disk. | `crit-commit start` — scanner starts, reads saved state, opens visual UI. Rested XP bonus if gap > 2 days. |
| Corrupted save file | game-state.backup.json exists. | Scanner detects corruption (JSON parse failure), falls back to backup. Player loses at most one batch interval of progress. |
| Total corruption | history.jsonl is append-only safety net. | `crit-commit start --repair` rebuilds game-state.json by replaying the full history log. |

### CLI commands

```bash
crit-commit start          # Normal start — resumes from saved state
crit-commit start --repair # Rebuilds game-state.json from history.jsonl
crit-commit status         # Shows current game state without starting
crit-commit reset          # Full reset with confirmation prompt
```

### Save file versioning

All save files (`game-state.json`, `history.jsonl`, `settings.json`) include a `schemaVersion` field (integer, starting at 1). When the game updates and the save format changes:
1. The scanner detects the version mismatch on startup
2. A migration function runs to transform the old format to the new format
3. A backup of the pre-migration file is created (`game-state.v1.backup.json`)
4. Migrations are always forward-only and non-destructive

Migration functions are maintained in `packages/shared/migrations/` as versioned scripts (e.g., `v1-to-v2.ts`).

### History log

`history.jsonl` is the ultimate safety net — an append-only log of every game event (XP gained, items dropped, quests completed, zones unlocked, Stackjack results). Same pattern Claude Code itself uses. Even with total save file corruption, the full game state can be reconstructed by replaying this log.

---

## 16. Labs Page (uzdavines.ai)

### Structure

- **Index page** at `/labs` — showcase cards with project name, description, status badge, and link. Crit Commit is the first card.
- **Sub-page** at `/labs/crit-commit` — detailed project page with description, screenshots, install command, GitHub link.

### Implementation

- New route: `apps/homepage/src/app/labs/page.tsx` (index)
- New route: `apps/homepage/src/app/labs/crit-commit/page.tsx` (detail)
- "Labs" added to `navItems` array in `src/components/Navigation.tsx`
- Follows existing design system: navy palette (`navy-900` through `navy-600`), Plus Jakarta Sans font, Framer Motion scroll-reveal animations, dark mode default
- Components follow existing patterns: `"use client"`, `motion` wrappers, Tailwind styling

### Deployment

Merge to `main` triggers existing GitHub Actions workflow (`deploy-homepage.yml`) which builds and triggers Render deploy hook. No new infrastructure needed.

---

## 17. Build & Deploy Method

### Primary build: Full Ralph Wiggum loop

- Uses Claude API key (not subscription) for overnight autonomous build
- Comprehensive `plan.md` with 30-50 atomic tasks organized in phases
- Test gates between iterations (lint, typecheck, build)
- Each iteration gets fresh context, reads plan.md, implements next incomplete task, runs verification, commits

### Iterative improvements: Mini Ralph

After the overnight build produces a working MVP, use Mini Ralph (the interactive `lite-loop.sh` approach from the existing MINI_RALPH_GUIDE.md) for:
- Bug fixes
- Feature polish
- UI refinements
- Community feedback responses

Mini Ralph uses the Claude Code subscription (Max plan), preserving API credits for larger builds.

---

## Appendix: File Structure

```
crit-commit/
+-- packages/
|   +-- scanner/          # Node.js JSONL watcher + event batcher
|   +-- game-engine/      # Game state management + Claude integration
|   +-- web-ui/           # PixiJS visual game + Stackjack + dashboard
|   +-- shared/           # TypeScript types, event contracts, constants
|   +-- cli/              # CLI commands (start, status, reset, repair)
+-- assets/
|   +-- sprites/          # Pixel art character sprites
|   +-- tilesets/         # Zone tilesets (16x16)
|   +-- ui/               # UI elements, icons, card art
|   +-- audio/            # Sound effects (optional, future)
+-- docs/
|   +-- GAME_DESIGN.md    # Full game mechanics documentation
|   +-- CONTRIBUTING.md   # Community contribution guidelines
|   +-- STACKJACK.md      # Card game rules reference
+-- community/
|   +-- leaderboard.json  # Score submission schema
|   +-- profile-template.md
+-- .github/
|   +-- workflows/        # CI/CD, community submission validation
+-- package.json          # Monorepo workspace config
+-- CLAUDE.md             # Claude Code project instructions
+-- README.md             # Public-facing project documentation
+-- LICENSE               # MIT
```
