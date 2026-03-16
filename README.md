# Crit Commit: A Claude Code RPG

A coding RPG that watches your Claude Code sessions and translates real coding activity into RPG gameplay. Every file edit, search, test run, and deployment becomes encounters, quests, and progression in a pixel art world unique to your coding style. Claude acts as your game master, generating narrative content based on your actual work.

> **Status:** MVP — playable but evolving. Pixel art assets are programmatic (sprite sheet integration coming post-MVP).

## Features

- **Real-time coding detection** — Node.js scanner watches Claude Code JSONL transcripts, extracting metadata (never source code or secrets)
- **4 character classes** — Architect, Scout, Artificer, Battlemage — each with unique bonuses tied to coding style
- **Dynamic zone generation** — Your coding patterns (Python, React, DevOps, etc.) generate unique world zones
- **3-tier quest system** — Micro-quests (free, pattern-matched), session quests (Claude-generated), and epic quests (multi-session arcs)
- **Crit system** — Exceptional coding outcomes (tests passing first try, clean deploys) trigger critical hits with bonus rewards
- **Stackjack card game** — Pazaak-inspired mini-game with collectible coding-themed cards
- **Party system** — Active Claude Code terminals become companion NPCs with pop-culture-inspired names
- **Ascension prestige** — Hit level 20, reset with permanent bonuses and a star on the leaderboard
- **PixiJS web UI** — Browser-based pixel art renderer with dashboard, world map, and animations
- **3-second rule** — RPG interactions never interrupt deep coding work

## Quick Start

```bash
# Install globally
npm install -g crit-commit

# Initialize your character
npx crit-commit init

# Start the scanner and web UI
crit-commit start
```

Then open `http://localhost:3000` in your browser to see your game world.

## How It Works

```
+---------------------------+       +------------------------+       +-------------------+
|   Claude Code Sessions    |       |     Node.js Scanner    |       |    Game Engine     |
|                           |       |                        |       |                    |
|  ~/.claude/projects/      | ----> |  JSONL watcher         | ----> |  Progression       |
|    <project>/<session>.   |       |  Metadata extraction   |       |  Quest generation  |
|    jsonl                  |       |  Event batching        |       |  Zone management   |
|                           |       |  Micro-quest engine    |       |  Claude narratives |
+---------------------------+       +------------------------+       +-------------------+
                                            |                                |
                                            v                                v
                                    +----------------------------------------------+
                                    |              PixiJS Web UI                    |
                                    |                                              |
                                    |  Dashboard | World Map | Stackjack | Quests  |
                                    |  localhost:3000 via Express + WebSocket       |
                                    +----------------------------------------------+
```

1. **Scanner** watches `~/.claude/projects/` for JSONL transcript activity. Extracts tool names, counts, and timing — never source code or secrets. Batches events on a configurable interval (default 5 min).

2. **Game Engine** receives compact event summaries. Manages progression (XP, leveling, crits), generates quests and narrative via Claude, tracks zones and party state. Persists game state to `~/.crit-commit/save/`.

3. **Web UI** renders the pixel art world in your browser. Shows dashboard stats, quest log, world map, Stackjack card table, and crit animations. Connects to the scanner via WebSocket for real-time updates.

## Multi-User Setup

On Linux systems where multiple user accounts use Claude Code, the scanner needs read access to JSONL files across accounts. Use a shared group:

```bash
# Create a shared group
sudo groupadd claude-watchers

# Add users to the group
sudo usermod -aG claude-watchers alice
sudo usermod -aG claude-watchers bob

# Set group permissions on the Claude projects directory
sudo chgrp -R claude-watchers /home/*/.claude/projects/
sudo chmod -R g+r /home/*/.claude/projects/
```

Each user still runs their own scanner and game instance with separate save files.

## Tech Stack

- **TypeScript 5** — Strict mode across all packages
- **Node.js 20** — Scanner, game engine, CLI
- **PixiJS 8** — Pixel art rendering (16x16 tiles, integer zoom)
- **Express + ws** — HTTP server and WebSocket for real-time updates
- **chokidar** — Cross-platform file watching
- **Vite** — Web UI build tooling
- **Vitest** — Test framework
- **ESLint 9** — Flat config linting
- **npm workspaces** — Monorepo management

## Project Structure

```
packages/
  scanner/       # JSONL watcher, event batcher, micro-quest engine, HTTP/WS server
  game-engine/   # Progression, Stackjack, zone/party management, Claude integration
  web-ui/        # PixiJS renderer, dashboard, Stackjack UI, world map
  shared/        # TypeScript types, event contracts, constants, card data
  cli/           # CLI commands (start, status, reset, repair)
```

## Documentation

- [Game Design Guide](docs/GAME_DESIGN.md) — Classes, materia, crits, quests, zones, progression
- [Stackjack Rules](docs/STACKJACK.md) — Complete card game rules and card catalog
- [Contributing](docs/CONTRIBUTING.md) — How to contribute to Crit Commit

## License

MIT
